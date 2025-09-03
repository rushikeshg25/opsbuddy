package internal

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DatabaseConfig struct {
	DSN                string
	MaxOpenConns       int
	MaxIdleConns       int
	ConnMaxLifetime    time.Duration
	ConnMaxIdleTime    time.Duration
	RetryAttempts      int
	RetryDelay         time.Duration
	HealthCheckTimeout time.Duration
}

// DefaultDatabaseConfig returns default database configuration
func DefaultDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		MaxOpenConns:       50, // Increased for higher throughput
		MaxIdleConns:       10, // More idle connections
		ConnMaxLifetime:    10 * time.Minute,
		ConnMaxIdleTime:    2 * time.Minute,
		RetryAttempts:      3,
		RetryDelay:         1 * time.Second,
		HealthCheckTimeout: 10 * time.Second,
	}
}

// Database represents a database connection with enhanced features
type Database struct {
	DB     *gorm.DB
	config DatabaseConfig
}

// ConnectDatabase connects to the database with retry logic and connection pooling
func ConnectDatabase(dsn string) (*gorm.DB, error) {
	return ConnectDatabaseWithConfig(dsn, DefaultDatabaseConfig())
}

// ConnectDatabaseWithConfig connects to the database with custom configuration
func ConnectDatabaseWithConfig(dsn string, config DatabaseConfig) (*gorm.DB, error) {
	config.DSN = dsn

	var db *gorm.DB
	var err error

	// Retry connection with exponential backoff
	for attempt := 0; attempt < config.RetryAttempts; attempt++ {
		if attempt > 0 {
			log.Printf("Retrying database connection, attempt %d/%d", attempt+1, config.RetryAttempts)
			time.Sleep(config.RetryDelay * time.Duration(attempt+1))
		}

		db, err = connectWithRetry(dsn, config)
		if err == nil {
			break
		}

		log.Printf("Database connection attempt %d failed: %v", attempt+1, err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", config.RetryAttempts, err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(config.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(config.ConnMaxIdleTime)

	// Enable TimescaleDB extension
	if err := enableTimescaleDB(db); err != nil {
		return nil, fmt.Errorf("failed to enable TimescaleDB: %w", err)
	}

	// Create hypertable for logs table
	if err := createHypertable(db); err != nil {
		return nil, fmt.Errorf("failed to create hypertable: %w", err)
	}

	log.Println("Database connected successfully with connection pooling")
	return db, nil
}

// connectWithRetry attempts to connect to the database
func connectWithRetry(dsn string, config DatabaseConfig) (*gorm.DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), config.HealthCheckTimeout)
	defer cancel()

	// Configure GORM with custom logger and settings for high performance
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Error), // Only log errors for performance
		NowFunc: func() time.Time {
			return time.Now().UTC() // Use UTC time
		},
		PrepareStmt:                              true, // Enable prepared statements for better performance
		DisableForeignKeyConstraintWhenMigrating: true, // Faster migrations
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.WithContext(ctx).Raw("SELECT 1").Error; err != nil {
		// Get underlying sql.DB to close it
		if sqlDB, sqlErr := db.DB(); sqlErr == nil {
			sqlDB.Close()
		}
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// Enable TimescaleDB extension
func enableTimescaleDB(db *gorm.DB) error {
	return db.Exec("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;").Error
}

// Create hypertable for logs table
func createHypertable(db *gorm.DB) error {
	// Check if hypertable already exists
	var exists bool
	err := db.Raw("SELECT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'logs')").Scan(&exists).Error
	if err != nil {
		return err
	}

	if !exists {
		// TimescaleDB requires any UNIQUE or PRIMARY KEY constraint to include the partitioning column (timestamp).
		// 1) Drop existing PK/UNIQUE constraints that don't include timestamp before creating the hypertable.
		var constraints []struct {
			ConName string
			ConDef  string
		}
		if err := db.Raw(
			"SELECT conname, pg_get_constraintdef(oid) AS condef FROM pg_constraint WHERE conrelid = 'logs'::regclass AND contype IN ('p','u')",
		).Scan(&constraints).Error; err == nil {
			for _, c := range constraints {
				// Skip invalid rows
				if strings.TrimSpace(c.ConName) == "" {
					continue
				}
				if c.ConDef == "" || !containsTimestamp(c.ConDef) {
					_ = db.Exec(fmt.Sprintf("ALTER TABLE logs DROP CONSTRAINT IF EXISTS %s;", c.ConName)).Error
					log.Printf("Dropped conflicting constraint on logs: %s (%s)", c.ConName, c.ConDef)
				}
			}
		}
		// As a safety net, try to drop the conventional primary key if it exists
		_ = db.Exec("ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_pkey;").Error

		// 2) Drop UNIQUE indexes that don't include timestamp
		var indexes []struct {
			IndexName string
			IndexDef  string
		}
		if err := db.Raw(
			"SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'logs'",
		).Scan(&indexes).Error; err == nil {
			for _, idx := range indexes {
				if strings.TrimSpace(idx.IndexName) == "" {
					continue
				}
				// detect unique indexes which don't include timestamp
				if strings.Contains(strings.ToLower(idx.IndexDef), "unique index") && !containsTimestamp(idx.IndexDef) {
					_ = db.Exec(fmt.Sprintf("DROP INDEX IF EXISTS %s;", idx.IndexName)).Error
					log.Printf("Dropped conflicting unique index on logs: %s (%s)", idx.IndexName, idx.IndexDef)
				}
			}
		}

		// Create hypertable with timestamp as the time dimension
		// chunk_time_interval is set to 7 days (you can adjust this based on your needs)
		err = db.Exec("SELECT create_hypertable('logs', 'timestamp', chunk_time_interval => INTERVAL '7 days');").Error
		if err != nil {
			return fmt.Errorf("failed to create hypertable: %w", err)
		}

		// Ensure a composite primary key that includes the partitioning key
		_ = db.Exec("ALTER TABLE logs ADD PRIMARY KEY (id, timestamp);").Error
		log.Println("TimescaleDB hypertable created successfully")
	}

	return nil
}

// containsTimestamp checks if a constraint definition references the timestamp column
func containsTimestamp(def string) bool {
	// simple case-insensitive contains check
	for _, s := range []string{"(timestamp)", ", timestamp", " timestamp ", "timestamp)"} {
		if containsCaseInsensitive(def, s) {
			return true
		}
	}
	return false
}

func containsCaseInsensitive(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (indexCaseInsensitive(haystack, needle) >= 0)
}

func indexCaseInsensitive(haystack, needle string) int {
	// naive lowercasing to avoid extra dependencies
	hl := make([]rune, 0, len(haystack))
	for _, r := range haystack {
		if r >= 'A' && r <= 'Z' {
			r = r - 'A' + 'a'
		}
		hl = append(hl, r)
	}
	nl := make([]rune, 0, len(needle))
	for _, r := range needle {
		if r >= 'A' && r <= 'Z' {
			r = r - 'A' + 'a'
		}
		nl = append(nl, r)
	}
	// simple substring search
	for i := 0; i+len(nl) <= len(hl); i++ {
		match := true
		for j := 0; j < len(nl); j++ {
			if hl[i+j] != nl[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// LogRepository represents a repository for log operations
type LogRepository struct {
	db     *gorm.DB
	config DatabaseConfig
}

// NewLogRepository creates a new log repository
func NewLogRepository(db *gorm.DB) *LogRepository {
	return &LogRepository{
		db:     db,
		config: DefaultDatabaseConfig(),
	}
}

// AddLog adds a log with current timestamp
func (r *LogRepository) AddLog(productID uint, logData string) (*Log, error) {
	return r.AddLogWithTimestamp(productID, logData, time.Now().UTC())
}

// AddLogWithTimestamp adds a log with specified timestamp
func (r *LogRepository) AddLogWithTimestamp(productID uint, logData string, timestamp time.Time) (*Log, error) {
	log := &Log{
		ProductID: productID,
		LogData:   logData,
		Timestamp: timestamp,
	}

	// Use context with timeout for database operations
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := r.db.WithContext(ctx).Create(log).Error; err != nil {
		return nil, fmt.Errorf("failed to create log: %w", err)
	}

	return log, nil
}

// AddLogsBatch adds multiple logs in batches with retry logic
func (r *LogRepository) AddLogsBatch(logs []Log) error {
	if len(logs) == 0 {
		return nil
	}

	// Optimize batch size based on log count
	batchSize := 500
	if len(logs) < 100 {
		batchSize = len(logs) // Use all logs if small batch
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Use transaction for batch operations with optimized settings
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Disable foreign key checks for better performance during batch insert
		if err := tx.Exec("SET session_replication_role = replica").Error; err != nil {
			log.Printf("Warning: Could not disable foreign key checks: %v", err)
		}

		err := tx.CreateInBatches(logs, batchSize).Error

		// Re-enable foreign key checks
		if err2 := tx.Exec("SET session_replication_role = DEFAULT").Error; err2 != nil {
			log.Printf("Warning: Could not re-enable foreign key checks: %v", err2)
		}

		return err
	})
}

// DeleteOldLogs deletes logs older than the specified time
func (r *LogRepository) DeleteOldLogs(olderThan time.Time) error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	result := r.db.WithContext(ctx).Where("timestamp < ?", olderThan).Delete(&Log{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete old logs: %w", result.Error)
	}

	log.Printf("Deleted %d old log entries older than %s", result.RowsAffected, olderThan.Format(time.RFC3339))
	return nil
}

// HealthCheck performs a database health check
func (r *LogRepository) HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), r.config.HealthCheckTimeout)
	defer cancel()

	// Test basic connectivity
	if err := r.db.WithContext(ctx).Raw("SELECT 1").Error; err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	// Test TimescaleDB functionality
	if err := r.db.WithContext(ctx).Raw("SELECT count(*) FROM timescaledb_information.hypertables").Error; err != nil {
		return fmt.Errorf("TimescaleDB health check failed: %w", err)
	}

	return nil
}

// GetStats returns database statistics
func (r *LogRepository) GetStats() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	stats := make(map[string]interface{})

	// Get total log count
	var totalLogs int64
	if err := r.db.WithContext(ctx).Model(&Log{}).Count(&totalLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to get total log count: %w", err)
	}
	stats["total_logs"] = totalLogs

	// Get logs count by product
	var productLogCounts []struct {
		ProductID uint  `json:"product_id"`
		Count     int64 `json:"count"`
	}
	if err := r.db.WithContext(ctx).Model(&Log{}).
		Select("product_id, count(*) as count").
		Group("product_id").
		Scan(&productLogCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to get product log counts: %w", err)
	}
	stats["logs_by_product"] = productLogCounts

	// Get recent log count (last 24 hours)
	var recentLogs int64
	yesterday := time.Now().UTC().Add(-24 * time.Hour)
	if err := r.db.WithContext(ctx).Model(&Log{}).
		Where("timestamp >= ?", yesterday).
		Count(&recentLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent log count: %w", err)
	}
	stats["recent_logs_24h"] = recentLogs

	return stats, nil
}

// Close closes the database connection
func (r *LogRepository) Close() error {
	if r.db != nil {
		sqlDB, err := r.db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

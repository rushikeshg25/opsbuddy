package internal

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type LogRepository struct {
	db *gorm.DB
}

func ConnectDatabase(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := enableTimescaleDB(db); err != nil {
		return nil, fmt.Errorf("failed to enable TimescaleDB: %w", err)
	}

	if err := createHypertable(db); err != nil {
		return nil, fmt.Errorf("failed to create hypertable: %w", err)
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
		// Create hypertable with timestamp as the time dimension
		// chunk_time_interval is set to 7 days (you can adjust this based on your needs)
		err = db.Exec("SELECT create_hypertable('logs', 'timestamp', chunk_time_interval => INTERVAL '7 days');").Error
		if err != nil {
			return fmt.Errorf("failed to create hypertable: %w", err)
		}
	}

	return nil
}

func NewLogRepository(db *gorm.DB) *LogRepository {
	return &LogRepository{db: db}
}

func (r *LogRepository) AddLog(productID uint, logData string) (*Log, error) {
	log := &Log{
		ProductID: productID,
		LogData:   logData,
		Timestamp: time.Now(),
	}

	if err := r.db.Create(log).Error; err != nil {
		return nil, fmt.Errorf("failed to create log: %w", err)
	}

	return log, nil
}

func (r *LogRepository) AddLogsBatch(logs []Log) error {
	if len(logs) == 0 {
		return nil
	}

	batchSize := 1000
	return r.db.CreateInBatches(logs, batchSize).Error
}

// // Query logs for a specific product within a time range
// func (r *LogRepository) GetLogsByProductAndTimeRange(productID uint, start, end time.Time) ([]Log, error) {
// 	var logs []Log
// 	err := r.db.Where("product_id = ? AND timestamp >= ? AND timestamp <= ?", productID, start, end).
// 		Order("timestamp DESC").
// 		Find(&logs).Error

// 	if err != nil {
// 		return nil, fmt.Errorf("failed to query logs: %w", err)
// 	}

// 	return logs, nil
// }

// // Query recent logs for a product (last N entries)
// func (r *LogRepository) GetRecentLogs(productID uint, limit int) ([]Log, error) {
// 	var logs []Log
// 	err := r.db.Where("product_id = ?", productID).
// 		Order("timestamp DESC").
// 		Limit(limit).
// 		Find(&logs).Error

// 	if err != nil {
// 		return nil, fmt.Errorf("failed to query recent logs: %w", err)
// 	}

// 	return logs, nil
// }

// // Query logs with pagination (using time-based cursor pagination for better performance)
// func (r *LogRepository) GetLogsPaginated(productID uint, before time.Time, limit int) ([]Log, error) {
// 	var logs []Log
// 	query := r.db.Where("product_id = ?", productID)

// 	if !before.IsZero() {
// 		query = query.Where("timestamp < ?", before)
// 	}

// 	err := query.Order("timestamp DESC").
// 		Limit(limit).
// 		Find(&logs).Error

// 	if err != nil {
// 		return nil, fmt.Errorf("failed to query logs with pagination: %w", err)
// 	}

// 	return logs, nil
// }

func (r *LogRepository) DeleteOldLogs(olderThan time.Time) error {
	result := r.db.Where("timestamp < ?", olderThan).Delete(&Log{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete old logs: %w", result.Error)
	}

	fmt.Printf("Deleted %d old log entries\n", result.RowsAffected)
	return nil
}

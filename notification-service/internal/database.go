package internal

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	DB *gorm.DB
}

func NewDatabase() (*Database, error) {
	host := getEnvOrDefault("DB_HOST", "localhost")
	port := getEnvOrDefault("DB_PORT", "5433")
	user := getEnvOrDefault("DB_USER", "postgres")
	password := getEnvOrDefault("DB_PASSWORD", "password")
	dbname := getEnvOrDefault("DB_NAME", "opsbuddy")
	sslmode := getEnvOrDefault("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		host, user, password, dbname, port, sslmode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying SQL DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Connected to TimescaleDB successfully")

	return &Database{DB: db}, nil
}

func (d *Database) GetLastLogs(productID uint, beforeTimestamp time.Time, limit int) ([]Log, error) {
	var logs []Log

	err := d.DB.Where("product_id = ? AND timestamp < ?", productID, beforeTimestamp).
		Order("timestamp DESC").
		Limit(limit).
		Find(&logs).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch logs for product %d: %w", productID, err)
	}

	return logs, nil
}

func (d *Database) GetProductWithUser(productID uint) (*Product, error) {
	var product Product

	err := d.DB.Preload("User").First(&product, productID).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch product %d with user: %w", productID, err)
	}

	return &product, nil
}

func (d *Database) CreateQuickFixes(downtimeID, productID uint, quickFixes []QuickFix) error {
	if len(quickFixes) == 0 {
		return nil
	}

	productQuickFixes := make([]ProductQuickFix, len(quickFixes))
	for i, qf := range quickFixes {
		productQuickFixes[i] = ProductQuickFix{
			DowntimeID:  downtimeID,
			ProductID:   productID,
			Title:       qf.Title,
			Description: qf.Description,
		}
	}

	err := d.DB.Create(&productQuickFixes).Error
	if err != nil {
		return fmt.Errorf("failed to create quick fixes: %w", err)
	}

	log.Printf("Created %d quick fixes for downtime %d", len(productQuickFixes), downtimeID)
	return nil
}

func (d *Database) GetActiveDowntime(productID uint) (*Downtime, error) {
	var downtime Downtime
	err := d.DB.Where("product_id = ? AND end_time IS NULL", productID).
		First(&downtime).Error

	if err != nil {
		return nil, err
	}

	return &downtime, nil
}

func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

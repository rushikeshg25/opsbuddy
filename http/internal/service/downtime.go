package service

import (
	"http/internal/database"
	"time"

	"gorm.io/gorm"
)

type DowntimeService struct {
	db *gorm.DB
}

func NewDowntimeService(db *gorm.DB) (*DowntimeService, error) {
	return &DowntimeService{
		db: db,
	}, nil
}

func (s *DowntimeService) GetDowntime(productID uint, startDate, endDate, status string) ([]database.Downtime, error) {
	var downtime []database.Downtime

	query := s.db.Where("product_id = ?", productID)

	// Apply filters
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if startDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, startDate); err == nil {
			query = query.Where("start_time >= ?", parsedDate)
		}
	}

	if endDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, endDate); err == nil {
			query = query.Where("start_time <= ?", parsedDate)
		}
	}

	// Order by start time descending (most recent first)
	if err := query.Order("start_time DESC").Find(&downtime).Error; err != nil {
		return nil, err
	}

	return downtime, nil
}
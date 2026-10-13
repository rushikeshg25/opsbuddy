package service

import (
	"http/internal/database"
	"time"

	"gorm.io/gorm"
)

type LogsService struct {
	db *gorm.DB
}

func NewLogsService(db *gorm.DB) (*LogsService, error) {
	return &LogsService{
		db: db,
	}, nil
}

func (s *LogsService) GetLogs(productID uint, limit, page int, level, startDate, endDate string) ([]database.Log, int, error) {
	limit, page = NormalizePagination(limit, page)
	logs := make([]database.Log, 0)
	var total int64

	query := s.db.Model(&database.Log{}).Where("product_id = ?", productID)

	// Apply filters
	if level != "" {
		// Filter by log level in JSON data
		query = query.Where("log_data LIKE ?", "%\"level\":\""+level+"\"%")
	}

	if startDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, startDate); err == nil {
			query = query.Where("timestamp >= ?", parsedDate)
		}
	}

	if endDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, endDate); err == nil {
			query = query.Where("timestamp <= ?", parsedDate)
		}
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination and ordering
	offset := (page - 1) * limit
	if err := query.Order("timestamp DESC, id DESC").Limit(limit).Offset(offset).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, int(total), nil
}

// NormalizePagination bounds work and prevents zero divisors and offset overflow.
func NormalizePagination(limit, page int) (int, int) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if page < 1 {
		page = 1
	}
	if page > 100000 {
		page = 100000
	}
	return limit, page
}

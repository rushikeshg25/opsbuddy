package service

import (
	"http/internal/database"
	"time"

	"gorm.io/gorm"
)

type QuickFixesService struct {
	db *gorm.DB
}

func NewQuickFixesService(db *gorm.DB) (*QuickFixesService, error) {
	return &QuickFixesService{
		db: db,
	}, nil
}

func (s *QuickFixesService) GetQuickFixes(productID uint, limit, page int, level, startDate, endDate string) ([]database.ProductQuickFix, int, error) {
	var quickfixes []database.ProductQuickFix
	var total int64

	query := s.db.Model(&database.ProductQuickFix{}).Where("product_id = ?", productID)

	if level != "" {
		query = query.Where("log_data LIKE ?", "%\"level\":\""+level+"\"%")
	}

	if startDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, startDate); err == nil {
			query = query.Where("created_at >= ?", parsedDate)
		}
	}

	if endDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, endDate); err == nil {
			query = query.Where("created_at <= ?", parsedDate)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&quickfixes).Error; err != nil {
		return nil, 0, err
	}

	return quickfixes, int(total), nil
}

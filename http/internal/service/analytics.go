package service

import (
	"http/internal/database"
	"time"

	"gorm.io/gorm"
)

type AnalyticsService struct {
	db *gorm.DB
}

type UptimeStats struct {
	ProductID          uint    `json:"product_id"`
	UptimePercentage   float64 `json:"uptime_percentage"`
	TotalDowntimeMinutes int   `json:"total_downtime_minutes"`
	IncidentCount      int     `json:"incident_count"`
	PeriodStart        string  `json:"period_start"`
	PeriodEnd          string  `json:"period_end"`
}

func NewAnalyticsService(db *gorm.DB) (*AnalyticsService, error) {
	return &AnalyticsService{
		db: db,
	}, nil
}

func (s *AnalyticsService) GetUptimeStats(productID uint, period, startDate, endDate string) (*UptimeStats, error) {
	var periodStart, periodEnd time.Time
	now := time.Now()

	// Determine time period
	if startDate != "" && endDate != "" {
		var err error
		periodStart, err = time.Parse(time.RFC3339, startDate)
		if err != nil {
			return nil, err
		}
		periodEnd, err = time.Parse(time.RFC3339, endDate)
		if err != nil {
			return nil, err
		}
	} else {
		// Use predefined periods
		switch period {
		case "24h":
			periodStart = now.Add(-24 * time.Hour)
		case "7d":
			periodStart = now.Add(-7 * 24 * time.Hour)
		case "30d":
			periodStart = now.Add(-30 * 24 * time.Hour)
		case "90d":
			periodStart = now.Add(-90 * 24 * time.Hour)
		default:
			periodStart = now.Add(-30 * 24 * time.Hour) // Default to 30 days
		}
		periodEnd = now
	}

	// Get downtime incidents in the period
	var downtimes []database.Downtime
	if err := s.db.Where("product_id = ? AND start_time >= ? AND start_time <= ?", 
		productID, periodStart, periodEnd).Find(&downtimes).Error; err != nil {
		return nil, err
	}

	// Calculate total downtime minutes
	var totalDowntimeMinutes int
	incidentCount := len(downtimes)

	for _, downtime := range downtimes {
		var endTime time.Time
		if downtime.EndTime != nil {
			endTime = *downtime.EndTime
		} else {
			// If incident is ongoing, use current time
			endTime = now
		}

		// Only count downtime within our period
		startTime := downtime.StartTime
		if startTime.Before(periodStart) {
			startTime = periodStart
		}
		if endTime.After(periodEnd) {
			endTime = periodEnd
		}

		if endTime.After(startTime) {
			duration := endTime.Sub(startTime)
			totalDowntimeMinutes += int(duration.Minutes())
		}
	}

	// Calculate uptime percentage
	totalPeriodMinutes := int(periodEnd.Sub(periodStart).Minutes())
	uptimeMinutes := totalPeriodMinutes - totalDowntimeMinutes
	uptimePercentage := float64(uptimeMinutes) / float64(totalPeriodMinutes) * 100

	// Ensure uptime percentage is between 0 and 100
	if uptimePercentage < 0 {
		uptimePercentage = 0
	}
	if uptimePercentage > 100 {
		uptimePercentage = 100
	}

	return &UptimeStats{
		ProductID:            productID,
		UptimePercentage:     uptimePercentage,
		TotalDowntimeMinutes: totalDowntimeMinutes,
		IncidentCount:        incidentCount,
		PeriodStart:          periodStart.Format(time.RFC3339),
		PeriodEnd:            periodEnd.Format(time.RFC3339),
	}, nil
}
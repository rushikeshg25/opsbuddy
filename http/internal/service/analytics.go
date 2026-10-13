package service

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type AnalyticsService struct {
	db *gorm.DB
}

type UptimeStats struct {
	ProductID            uint    `json:"product_id"`
	UptimePercentage     float64 `json:"uptime_percentage"`
	TotalDowntimeMinutes int     `json:"total_downtime_minutes"`
	IncidentCount        int     `json:"incident_count"`
	PeriodStart          string  `json:"period_start"`
	PeriodEnd            string  `json:"period_end"`
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

	if !periodEnd.After(periodStart) {
		return nil, errors.New("end date must be after start date")
	}
	// Return one aggregate row instead of allocating every incident in Go.
	// range_agg merges overlapping intervals so downtime is not counted twice.
	var totals struct {
		Minutes       float64
		IncidentCount int
	}
	err := s.db.Raw(`
        WITH incidents AS (
            SELECT GREATEST(start_time, ?) AS start_at,
                   LEAST(COALESCE(end_time, ?), ?) AS end_at
            FROM downtimes
            WHERE product_id = ? AND start_time < ?
              AND (end_time IS NULL OR end_time > ?)
        ), merged AS (
            SELECT range_agg(tstzrange(start_at, end_at, '[)')) AS periods
            FROM incidents WHERE end_at > start_at
        )
        SELECT COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (upper(p) - lower(p)))) / 60
                        FROM merged, unnest(periods) AS p), 0) AS minutes,
               (SELECT COUNT(*) FROM incidents) AS incident_count`,
		periodStart, now, periodEnd, productID, periodEnd, periodStart).Scan(&totals).Error
	if err != nil {
		return nil, err
	}
	totalDowntimeMinutes := int(totals.Minutes)
	incidentCount := totals.IncidentCount
	uptimePercentage := max(0, min(100, 100*(1-totals.Minutes/periodEnd.Sub(periodStart).Minutes())))

	return &UptimeStats{
		ProductID:            productID,
		UptimePercentage:     uptimePercentage,
		TotalDowntimeMinutes: totalDowntimeMinutes,
		IncidentCount:        incidentCount,
		PeriodStart:          periodStart.Format(time.RFC3339),
		PeriodEnd:            periodEnd.Format(time.RFC3339),
	}, nil
}

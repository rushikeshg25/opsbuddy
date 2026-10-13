package service

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"testing"
	"time"
)

func TestUptimeRejectsInvalidWindow(t *testing.T) {
	s := &AnalyticsService{}
	if _, err := s.GetUptimeStats(1, "", "2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z"); err == nil {
		t.Fatal("reversed window accepted")
	}
}

// Optional integration test; use a disposable PostgreSQL 14+ database.
func TestUptimeAggregationPostgres(t *testing.T) {
	dsn := os.Getenv("OPSBUDDY_TEST_DSN")
	if dsn == "" {
		t.Skip("OPSBUDDY_TEST_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	tx := db.Begin()
	defer tx.Rollback()
	if err := tx.Exec("CREATE TEMP TABLE downtimes (product_id bigint, start_time timestamptz, end_time timestamptz)").Error; err != nil {
		t.Fatal(err)
	}
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	// Clipped 00:00-00:20, overlapping 00:10-00:30, plus 00:50-01:00 ongoing.
	for _, v := range []struct {
		from int
		to   *int
	}{{-10, ptr(20)}, {10, ptr(30)}, {50, nil}} {
		var end *time.Time
		if v.to != nil {
			value := start.Add(time.Duration(*v.to) * time.Minute)
			end = &value
		}
		if err := tx.Exec("INSERT INTO downtimes VALUES (?, ?, ?)", 1, start.Add(time.Duration(v.from)*time.Minute), end).Error; err != nil {
			t.Fatal(err)
		}
	}
	s := &AnalyticsService{db: tx}
	result, err := s.GetUptimeStats(1, "", start.Format(time.RFC3339), start.Add(time.Hour).Format(time.RFC3339))
	if err != nil {
		t.Fatal(err)
	}
	if result.TotalDowntimeMinutes != 40 || result.IncidentCount != 3 || result.UptimePercentage < 33.33 || result.UptimePercentage > 33.34 {
		t.Fatalf("unexpected aggregate: %+v", result)
	}
	empty, err := s.GetUptimeStats(2, "", start.Format(time.RFC3339), start.Add(time.Hour).Format(time.RFC3339))
	if err != nil || empty.UptimePercentage != 100 {
		t.Fatalf("empty history: %+v, %v", empty, err)
	}
}
func ptr(v int) *int { return &v }

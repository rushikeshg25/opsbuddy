package database

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) error {
	log.Println("Starting database seeding...")

	var user User
	result := db.Where("id = ?", 1).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			user = User{
				ID:          1,
				Username:    "testuser",
				Email:       "test@example.com",
				Name:        "Test User",
				AvatarURL:   "https://avatars.githubusercontent.com/u/1?v=4",
				Provider:    "google",
				ProviderID:  "123456789",
				AccessToken: "dummy_token",
				CreatedAt:   time.Now().AddDate(0, -2, 0),
				UpdatedAt:   time.Now(),
			}
			if err := db.Create(&user).Error; err != nil {
				return fmt.Errorf("failed to create test user: %w", err)
			}
			log.Println("Created test user")
		} else {
			return fmt.Errorf("failed to check for existing user: %w", result.Error)
		}
	}

	products := []Product{
		{
			Name:        "API Gateway Service",
			Description: "Main API gateway handling all incoming requests",
			UserID:      1,
			CreatedAt:   time.Now().AddDate(0, -1, -15), // 1 month 15 days ago
			AuthToken:   uuid.New(),
			HealthAPI:   "https://api.example.com/health",
		},
		{
			Name:        "User Authentication Service",
			Description: "Handles user authentication and authorization",
			UserID:      1,
			CreatedAt:   time.Now().AddDate(0, -1, -5), // 1 month 5 days ago
			AuthToken:   uuid.New(),
			HealthAPI:   "https://auth.example.com/health",
		},
	}

	for i, product := range products {
		var existingProduct Product
		result := db.Where("name = ? AND user_id = ?", product.Name, product.UserID).First(&existingProduct)
		if result.Error == gorm.ErrRecordNotFound {
			if err := db.Create(&product).Error; err != nil {
				return fmt.Errorf("failed to create product %s: %w", product.Name, err)
			}
			products[i] = product // Update with the created product (including ID)
			log.Printf("Created product: %s", product.Name)
		} else if result.Error != nil {
			return fmt.Errorf("failed to check for existing product: %w", result.Error)
		} else {
			products[i] = existingProduct // Use existing product
			log.Printf("Product already exists: %s", existingProduct.Name)
		}
	}

	// Seed logs for each product
	for _, product := range products {
		if err := seedLogs(db, product.ID); err != nil {
			return fmt.Errorf("failed to seed logs for product %d: %w", product.ID, err)
		}
	}

	// Seed downtime records for each product
	for _, product := range products {
		if err := seedDowntime(db, product.ID); err != nil {
			return fmt.Errorf("failed to seed downtime for product %d: %w", product.ID, err)
		}
	}

	log.Println("Database seeding completed successfully!")
	return nil
}

// seedLogs creates dummy log entries for a product
func seedLogs(db *gorm.DB, productID uint) error {
	// Check if logs already exist for this product
	var count int64
	db.Model(&Log{}).Where("product_id = ?", productID).Count(&count)
	if count > 0 {
		log.Printf("Logs already exist for product %d, skipping", productID)
		return nil
	}

	logLevels := []string{"info", "warn", "error", "debug"}
	logMessages := []string{
		"Request processed successfully",
		"Database connection established",
		"Cache miss for key: user_sessions",
		"Authentication token validated",
		"Rate limit exceeded for IP",
		"Database query timeout",
		"Memory usage above threshold",
		"Service health check passed",
		"Failed to connect to external API",
		"User session expired",
		"Invalid request payload",
		"Service started successfully",
	}

	// Generate logs for the last 30 days
	now := time.Now()
	for i := 0; i < 30; i++ {
		day := now.AddDate(0, 0, -i)

		// Generate 10-50 logs per day
		logsPerDay := rand.Intn(40) + 10

		for j := 0; j < logsPerDay; j++ {
			// Random time during the day
			hour := rand.Intn(24)
			minute := rand.Intn(60)
			second := rand.Intn(60)

			logTime := time.Date(day.Year(), day.Month(), day.Day(), hour, minute, second, 0, time.UTC)

			level := logLevels[rand.Intn(len(logLevels))]
			message := logMessages[rand.Intn(len(logMessages))]

			// Create structured log data
			logEntry := map[string]interface{}{
				"timestamp": logTime.Format(time.RFC3339),
				"level":     level,
				"message":   message,
				"service":   fmt.Sprintf("product-%d", productID),
				"trace_id":  uuid.New().String()[:8],
			}

			// Add extra fields based on log level
			switch level {
			case "error":
				logEntry["error_code"] = fmt.Sprintf("E%d", rand.Intn(9999)+1000)
				logEntry["stack_trace"] = "at main.handler (app.go:123)"
			case "warn":
				logEntry["warning_type"] = []string{"performance", "security", "deprecation"}[rand.Intn(3)]
			case "info":
				logEntry["request_id"] = uuid.New().String()[:12]
				logEntry["duration_ms"] = rand.Intn(1000) + 50
			}

			logDataBytes, _ := json.Marshal(logEntry)

			log := Log{
				ProductID: productID,
				LogData:   string(logDataBytes),
				Timestamp: logTime,
			}

			if err := db.Create(&log).Error; err != nil {
				return fmt.Errorf("failed to create log entry: %w", err)
			}
		}
	}

	log.Printf("Created logs for product %d", productID)
	return nil
}

func seedDowntime(db *gorm.DB, productID uint) error {
	var count int64
	db.Model(&Downtime{}).Where("product_id = ?", productID).Count(&count)
	if count > 0 {
		log.Printf("Downtime records already exist for product %d, skipping", productID)
		return nil
	}

	now := time.Now()

	// Create 3-5 downtime incidents over the last 90 days
	numIncidents := rand.Intn(3) + 3

	for i := 0; i < numIncidents; i++ {
		// Random day in the last 90 days
		daysAgo := rand.Intn(90) + 1
		incidentDay := now.AddDate(0, 0, -daysAgo)

		startHour := rand.Intn(24)
		startMinute := rand.Intn(60)
		startTime := time.Date(incidentDay.Year(), incidentDay.Month(), incidentDay.Day(),
			startHour, startMinute, 0, 0, time.UTC)

		durationMinutes := rand.Intn(235) + 5
		endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

		// Random status
		statuses := []string{"down", "degraded"}
		status := statuses[rand.Intn(len(statuses))]

		downtime := Downtime{
			ProductID:          productID,
			StartTime:          startTime,
			EndTime:            &endTime,
			Status:             status,
			IsNotificationSent: true,
		}

		if err := db.Create(&downtime).Error; err != nil {
			return fmt.Errorf("failed to create downtime record: %w", err)
		}
	}

	// Create one ongoing incident (no end time) with 10% probability
	if rand.Float32() < 0.1 {
		recentTime := now.Add(-time.Duration(rand.Intn(120)) * time.Minute) // Within last 2 hours

		ongoingDowntime := Downtime{
			ProductID:          productID,
			StartTime:          recentTime,
			EndTime:            nil, // Ongoing
			Status:             "down",
			IsNotificationSent: true,
		}

		if err := db.Create(&ongoingDowntime).Error; err != nil {
			return fmt.Errorf("failed to create ongoing downtime record: %w", err)
		}

		log.Printf("Created ongoing downtime incident for product %d", productID)
	}

	log.Printf("Created downtime records for product %d", productID)
	return nil
}

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"log-consumer-service/internal"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	brokers := []string{"localhost:9094"}
	topic := "logs"
	groupId := "log-consumer-service"

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"))

	db, err := internal.ConnectDatabase(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate the database schema
	if err := db.AutoMigrate(&internal.User{}, &internal.Product{}, &internal.Log{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	logr := internal.NewLogRepository(db)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	consumer := internal.NewConsumer(brokers, topic, groupId)

	go func() {
		sigch := make(chan os.Signal, 1)
		signal.Notify(sigch, syscall.SIGINT, syscall.SIGTERM)
		<-sigch
		fmt.Println("Shutting down consumers...")
		cancel()
		consumer.Close()
		log.Println("Consumers stopped")
	}()

	// Batch processing for better performance
	logBatch := make([]internal.Log, 0, 100)
	batchTicker := time.NewTicker(5 * time.Second) // Flush batch every 5 seconds
	defer batchTicker.Stop()

	// Function to flush the batch
	flushBatch := func() {
		if len(logBatch) > 0 {
			if err := logr.AddLogsBatch(logBatch); err != nil {
				log.Printf("Error saving batch to database: %v", err)
			} else {
				log.Printf("Successfully saved batch of %d logs to TimescaleDB", len(logBatch))
			}
			logBatch = logBatch[:0] // Clear the batch
		}
	}

	// Start batch flusher goroutine
	go func() {
		for {
			select {
			case <-batchTicker.C:
				flushBatch()
			case <-ctx.Done():
				flushBatch() // Flush remaining logs before shutdown
				return
			}
		}
	}()

	err = consumer.Read(ctx, func(key, value string) {
		// Parse the product ID from the key
		productID, err := strconv.ParseUint(key, 10, 32)
		if err != nil {
			log.Printf("Error parsing product ID from key '%s': %v", key, err)
			return
		}

		// Parse the JSON log entry
		var logEntry struct {
			Timestamp string `json:"timestamp"`
			Message   string `json:"message"`
		}

		if err := json.Unmarshal([]byte(value), &logEntry); err != nil {
			log.Printf("Error parsing log entry JSON: %v", err)
			return
		}

		// Parse the timestamp
		timestamp, err := time.Parse(time.RFC3339, logEntry.Timestamp)
		if err != nil {
			log.Printf("Error parsing timestamp '%s': %v", logEntry.Timestamp, err)
			// Use current time as fallback
			timestamp = time.Now()
		}

		// Create log entry for database
		logData := internal.Log{
			ProductID: uint(productID),
			LogData:   logEntry.Message,
			Timestamp: timestamp,
		}

		// Add to batch
		logBatch = append(logBatch, logData)

		// Flush batch if it reaches the limit
		if len(logBatch) >= 100 {
			flushBatch()
		}
	})
	if err != nil {
		log.Fatalf("Failed to read messages: %v", err)
	}

	<-ctx.Done()
}

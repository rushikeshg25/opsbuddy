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

	err = consumer.Read(ctx, func(key, value string) {
		// Parse the product ID from the key
		productID, err := strconv.ParseUint(key, 10, 32)
		if err != nil {
			log.Printf("Error parsing product ID from key '%s': %v", key, err)
			return
		}

		// Parse the JSON batch
		var batch struct {
			ProductID string `json:"product_id"`
			Logs      []struct {
				Timestamp string `json:"timestamp"`
				Message   string `json:"message"`
			} `json:"logs"`
		}

		if err := json.Unmarshal([]byte(value), &batch); err != nil {
			log.Printf("Error parsing batch JSON: %v", err)
			return
		}

		// Process each log in the batch individually
		successCount := 0
		for _, logEntry := range batch.Logs {
			// Parse the timestamp
			timestamp, err := time.Parse(time.RFC3339, logEntry.Timestamp)
			if err != nil {
				log.Printf("Error parsing timestamp '%s': %v", logEntry.Timestamp, err)
				// Use current time as fallback
				timestamp = time.Now()
			}

			// Add individual log to TimescaleDB with original timestamp
			_, err = logr.AddLogWithTimestamp(uint(productID), logEntry.Message, timestamp)
			if err != nil {
				log.Printf("Error saving individual log to database: %v", err)
				continue
			}
			successCount++
		}

		log.Printf("Successfully processed batch: %d/%d logs saved for product %d", successCount, len(batch.Logs), productID)
	})
	if err != nil {
		log.Fatalf("Failed to read messages: %v", err)
	}

	<-ctx.Done()
}

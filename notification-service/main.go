package main

import (
	"context"
	"fmt"
	"log"
	"notification-service/internal"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

func validateEnvironment() error {
	requiredVars := []string{
		"KAFKA_BROKERS",
		"KAFKA_TOPIC",
	}

	var missingVars []string
	for _, envVar := range requiredVars {
		if value := os.Getenv(envVar); value == "" {
			missingVars = append(missingVars, envVar)
		}
	}

	if len(missingVars) > 0 {
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missingVars, ", "))
	}

	smtpEmail := os.Getenv("SMTP_FROM_EMAIL")
	smtpPassword := os.Getenv("SMTP_FROM_PASSWORD")

	if smtpEmail == "" || smtpPassword == "" {
		log.Println("Warning: SMTP credentials not configured")
	} else {
		log.Printf("SMTP configured for email notifications from: %s", smtpEmail)
	}

	if kafkaBrokers := os.Getenv("KAFKA_BROKERS"); kafkaBrokers != "" {
		brokers := strings.Split(kafkaBrokers, ",")
		for _, broker := range brokers {
			broker = strings.TrimSpace(broker)
			if broker == "" {
				return fmt.Errorf("invalid KAFKA_BROKERS format: empty broker found")
			}
		}
	}

	return nil
}

func main() {
	log.Println("Starting OpsBuddy Notification Service...")

	if err := validateEnvironment(); err != nil {
		log.Fatalf("Environment validation failed: %v", err)
	}

	db, err := internal.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	processor := internal.NewNotificationProcessor(db)
	defer func() {
		if err := processor.Close(); err != nil {
			log.Printf("Error closing processor: %v", err)
		}
	}()

	kafkaBrokersStr := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokersStr == "" {
		kafkaBrokersStr = "localhost:9094"
	}
	kafkaBrokers := strings.Split(kafkaBrokersStr, ",")
	for i, broker := range kafkaBrokers {
		kafkaBrokers[i] = strings.TrimSpace(broker)
	}

	kafkaTopic := os.Getenv("KAFKA_TOPIC")
	if kafkaTopic == "" {
		kafkaTopic = "notifications"
	}

	kafkaConsumer := internal.NewKafkaConsumer(
		kafkaBrokers,
		kafkaTopic,             // Topic
		"notification-service", // Consumer group ID
	)
	defer func() {
		if err := kafkaConsumer.Close(); err != nil {
			log.Printf("Error closing Kafka consumer: %v", err)
		}
	}()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()

		handler := func(event internal.NotificationEvent) error {
			return processor.ProcessNotification(ctx, event)
		}

		if err := kafkaConsumer.ConsumeNotifications(ctx, handler); err != nil {
			if err != context.Canceled {
				log.Printf("Kafka consumer error: %v", err)
			}
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Notification service is running...")
	log.Println("Listening for notifications on Kafka topic 'notifications'")
	log.Println("Press Ctrl+C to stop")

	<-sigChan
	log.Println("Received shutdown signal, initiating graceful shutdown...")

	cancel()

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Println("All goroutines finished successfully")
	case <-time.After(30 * time.Second):
		log.Println("Timeout waiting for goroutines to finish")
	}

	log.Println("Notification service shutdown complete")
}

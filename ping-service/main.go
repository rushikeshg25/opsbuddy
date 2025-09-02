package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"ping-service/internal"
	"strings"
	"syscall"

	_ "github.com/joho/godotenv/autoload"
)

// validateEnvironment checks that all required environment variables are set
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

	// Validate specific formats
	if kafkaBrokers := os.Getenv("KAFKA_BROKERS"); kafkaBrokers != "" {
		brokers := strings.Split(kafkaBrokers, ",")
		for _, broker := range brokers {
			trimmedBroker := strings.TrimSpace(broker)
			if trimmedBroker == "" {
				return fmt.Errorf("invalid KAFKA_BROKERS format: empty broker found")
			}
		}
	}

	return nil
}

func main() {
	// Validate environment variables before starting
	if err := validateEnvironment(); err != nil {
		log.Fatalf("Environment validation failed: %v", err)
	}

	log.Println("Environment validation passed")

	db := internal.New()
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	pingService := internal.NewPingService(db, 5)

	if err := pingService.Start(); err != nil {
		log.Fatalf("Failed to start ping service: %v", err)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Ping service is running. Press Ctrl+C to stop.")
	<-sigChan

	log.Println("Received shutdown signal")
	pingService.Stop()
	log.Println("Ping service shutdown complete")
}

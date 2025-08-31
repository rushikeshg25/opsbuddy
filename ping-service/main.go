package main

import (
	"log"
	"os"
	"os/signal"
	"ping-service/internal"
	"syscall"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
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

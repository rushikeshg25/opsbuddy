package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"agent-service/internal"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	log.Println("Starting OpsBuddy Agent Service...")

	ctx := context.Background()

	db, err := internal.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	llm, err := internal.NewGeminiProvider(ctx)
	if err != nil {
		log.Fatalf("Failed to create LLM provider: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      internal.NewRouter(llm, db),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 120 * time.Second, // long: agent responses stream over SSE
		IdleTimeout:  time.Minute,
	}

	go func() {
		log.Printf("Agent service listening on :%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to serve: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down agent service...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	log.Println("Agent service stopped")
}

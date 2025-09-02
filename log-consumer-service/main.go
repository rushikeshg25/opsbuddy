package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"log-consumer-service/internal"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"gorm.io/gorm"
)

// Config holds application configuration
type Config struct {
	KafkaBrokers []string
	KafkaTopic   string
	GroupID      string
	Database     DatabaseConfig
	Consumer     ConsumerConfig
	Server       ServerConfig
}

type DatabaseConfig struct {
	Host     string
	User     string
	Password string
	DBName   string
	Port     string
	SSLMode  string
}

type ConsumerConfig struct {
	BatchSize      int
	WorkerCount    int
	CommitInterval time.Duration
	MaxRetries     int
}

type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

// Default configuration
func defaultConfig() *Config {
	return &Config{
		KafkaBrokers: []string{"localhost:9094"},
		KafkaTopic:   "logs",
		GroupID:      "log-consumer-service",
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "password"),
			DBName:   getEnv("DB_NAME", "opsbuddy"),
			Port:     getEnv("DB_PORT", "5433"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Consumer: ConsumerConfig{
			BatchSize:      500,              // Increased batch size for better throughput
			WorkerCount:    5,                // More workers for parallel processing
			CommitInterval: 10 * time.Second, // More frequent commits
			MaxRetries:     3,
		},
		Server: ServerConfig{
			Port:            getEnv("SERVER_PORT", "8080"),
			ReadTimeout:     30 * time.Second,
			WriteTimeout:    30 * time.Second,
			ShutdownTimeout: 30 * time.Second,
		},
	}
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// Application represents the main application
type Application struct {
	config    *Config
	db        *gorm.DB
	consumer  *internal.Consumer
	logRepo   *internal.LogRepository
	ctx       context.Context
	cancel    context.CancelFunc
	done      chan struct{}
	server    *http.Server
	startTime time.Time
}

// NewApplication creates a new application instance
func NewApplication(config *Config) *Application {
	ctx, cancel := context.WithCancel(context.Background())
	return &Application{
		config:    config,
		ctx:       ctx,
		cancel:    cancel,
		done:      make(chan struct{}),
		startTime: time.Now(),
	}
}

// Initialize sets up the application components
func (app *Application) Initialize() error {
	log.Println("Initializing log consumer service...")

	// Connect to database
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		app.config.Database.Host, app.config.Database.User, app.config.Database.Password,
		app.config.Database.DBName, app.config.Database.Port, app.config.Database.SSLMode)

	db, err := internal.ConnectDatabase(dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}
	app.db = db

	// Auto-migrate the database schema
	if err := app.db.AutoMigrate(&internal.User{}, &internal.Product{}, &internal.Log{}); err != nil {
		return fmt.Errorf("failed to migrate database: %v", err)
	}

	// Initialize log repository
	app.logRepo = internal.NewLogRepository(db)

	// Initialize Kafka consumer
	app.consumer = internal.NewConsumer(
		app.config.KafkaBrokers,
		app.config.KafkaTopic,
		app.config.GroupID,
	)

	// Initialize HTTP server
	app.setupHTTPServer()

	log.Println("Application initialized successfully")
	return nil
}

// setupHTTPServer sets up the HTTP server with health check and metrics endpoints
func (app *Application) setupHTTPServer() {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", app.healthHandler)

	// Metrics endpoint
	mux.HandleFunc("/metrics", app.metricsHandler)

	// Status endpoint
	mux.HandleFunc("/status", app.statusHandler)

	app.server = &http.Server{
		Addr:         ":" + app.config.Server.Port,
		Handler:      mux,
		ReadTimeout:  app.config.Server.ReadTimeout,
		WriteTimeout: app.config.Server.WriteTimeout,
	}
}

// healthHandler handles health check requests
func (app *Application) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "log-consumer-service",
		"uptime":    time.Since(app.startTime).String(),
	}

	// Check database health
	if err := app.logRepo.HealthCheck(); err != nil {
		health["status"] = "unhealthy"
		health["database_error"] = err.Error()
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		health["database"] = "healthy"
	}

	// Check consumer health
	if app.consumer.IsHealthy() {
		health["consumer"] = "healthy"
	} else {
		health["status"] = "unhealthy"
		health["consumer"] = "unhealthy"
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	json.NewEncoder(w).Encode(health)
}

// metricsHandler handles metrics requests
func (app *Application) metricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	metrics := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(app.startTime).String(),
	}

	// Get database stats
	if stats, err := app.logRepo.GetStats(); err == nil {
		metrics["database_stats"] = stats
	} else {
		metrics["database_stats_error"] = err.Error()
	}

	// Get consumer stats
	if stats, err := app.consumer.GetStats(); err == nil {
		metrics["consumer_stats"] = stats
	} else {
		metrics["consumer_stats_error"] = err.Error()
	}

	json.NewEncoder(w).Encode(metrics)
}

// statusHandler handles status requests
func (app *Application) statusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	status := map[string]interface{}{
		"status":    "running",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "log-consumer-service",
		"version":   "1.0.0",
		"uptime":    time.Since(app.startTime).String(),
		"config": map[string]interface{}{
			"kafka_topic": app.config.KafkaTopic,
			"kafka_group": app.config.GroupID,
			"database":    fmt.Sprintf("%s:%s/%s", app.config.Database.Host, app.config.Database.Port, app.config.Database.DBName),
		},
	}

	json.NewEncoder(w).Encode(status)
}

// Start begins processing messages and starts the HTTP server
func (app *Application) Start() error {
	log.Printf("Starting consumer with batch size: %d", app.config.Consumer.BatchSize)

	// Start HTTP server in a goroutine
	go func() {
		log.Printf("Starting HTTP server on port %s", app.config.Server.Port)
		if err := app.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	// Start message processing
	err := app.consumer.Read(app.ctx, app.messageHandler)
	if err != nil {
		return fmt.Errorf("failed to read messages: %v", err)
	}

	return nil
}

// messageHandler processes individual messages
func (app *Application) messageHandler(key, value string) {
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

	// Convert to internal Log structs for batch processing
	logs := make([]internal.Log, 0, len(batch.Logs))
	for _, logEntry := range batch.Logs {
		// Parse the timestamp
		timestamp, err := time.Parse(time.RFC3339, logEntry.Timestamp)
		if err != nil {
			log.Printf("Error parsing timestamp '%s': %v", logEntry.Timestamp, err)
			// Use current time as fallback
			timestamp = time.Now().UTC()
		}

		logs = append(logs, internal.Log{
			ProductID: uint(productID),
			LogData:   logEntry.Message,
			Timestamp: timestamp,
		})
	}

	// Use batch insert for much better performance
	if err := app.logRepo.AddLogsBatch(logs); err != nil {
		log.Printf("Error saving batch to database: %v", err)
		return
	}

	log.Printf("Successfully processed batch: %d/%d logs saved for product %d",
		len(logs), len(batch.Logs), productID)
}

// Shutdown gracefully shuts down the application
func (app *Application) Shutdown() {
	log.Println("Shutting down log consumer service...")

	// Cancel context to stop message processing
	app.cancel()

	// Shutdown HTTP server gracefully
	if app.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), app.config.Server.ShutdownTimeout)
		defer cancel()

		if err := app.server.Shutdown(ctx); err != nil {
			log.Printf("Error shutting down HTTP server: %v", err)
		} else {
			log.Println("HTTP server shut down successfully")
		}
	}

	// Close consumer
	if app.consumer != nil {
		if err := app.consumer.Close(); err != nil {
			log.Printf("Error closing consumer: %v", err)
		} else {
			log.Println("Consumer closed successfully")
		}
	}

	// Close database connection
	if app.db != nil {
		sqlDB, err := app.db.DB()
		if err == nil {
			if err := sqlDB.Close(); err != nil {
				log.Printf("Error closing database: %v", err)
			} else {
				log.Println("Database connection closed successfully")
			}
		}
	}

	// Signal completion
	close(app.done)
	log.Println("Log consumer service shutdown complete")
}

// Wait waits for the application to complete
func (app *Application) Wait() {
	<-app.done
}

func main() {
	// Load configuration
	config := defaultConfig()

	// Create application
	app := NewApplication(config)

	// Initialize application
	if err := app.Initialize(); err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	// Set up signal handling for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	// Start application in a goroutine
	go func() {
		if err := app.Start(); err != nil {
			log.Printf("Application error: %v", err)
			app.cancel()
		}
	}()

	// Wait for shutdown signal
	sig := <-sigCh
	log.Printf("Received signal: %v", sig)

	// Graceful shutdown
	app.Shutdown()

	// Wait for shutdown to complete
	app.Wait()
}

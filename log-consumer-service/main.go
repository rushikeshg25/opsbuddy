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
	"gorm.io/gorm"
)

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
			BatchSize:      500,
			WorkerCount:    5,
			CommitInterval: 10 * time.Second,
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

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

type Application struct {
	config    *Config
	db        *gorm.DB
	consumer  *internal.Consumer
	logRepo   *internal.LogRepository
	ctx       context.Context
	cancel    context.CancelFunc
	done      chan struct{}
	startTime time.Time
}

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

func (app *Application) Initialize() error {
	log.Println("Initializing log consumer service...")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		app.config.Database.Host, app.config.Database.User, app.config.Database.Password,
		app.config.Database.DBName, app.config.Database.Port, app.config.Database.SSLMode)

	db, err := internal.ConnectDatabase(dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}
	app.db = db

	if err := app.db.AutoMigrate(&internal.User{}, &internal.Product{}, &internal.Log{}); err != nil {
		return fmt.Errorf("failed to migrate database: %v", err)
	}

	app.logRepo = internal.NewLogRepository(db)

	app.consumer = internal.NewConsumer(
		app.config.KafkaBrokers,
		app.config.KafkaTopic,
		app.config.GroupID,
	)

	log.Println("Application initialized successfully")
	return nil
}

func (app *Application) Start() error {
	log.Printf("Starting consumer with batch size: %d", app.config.Consumer.BatchSize)

	err := app.consumer.Read(app.ctx, app.messageHandler)
	if err != nil {
		return fmt.Errorf("failed to read messages: %v", err)
	}

	return nil
}

func (app *Application) messageHandler(key, value string) {
	productID, err := strconv.ParseUint(key, 10, 32)
	if err != nil {
		log.Printf("Error parsing product ID from key '%s': %v", key, err)
		return
	}

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

	logs := make([]internal.Log, 0, len(batch.Logs))
	for _, logEntry := range batch.Logs {
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

	if err := app.logRepo.AddLogsBatch(logs); err != nil {
		log.Printf("Error saving batch to database: %v", err)
		return
	}

	log.Printf("Successfully processed batch: %d/%d logs saved for product %d",
		len(logs), len(batch.Logs), productID)
}

func (app *Application) Shutdown() {
	log.Println("Shutting down log consumer service...")

	app.cancel()

	if app.consumer != nil {
		if err := app.consumer.Close(); err != nil {
			log.Printf("Error closing consumer: %v", err)
		} else {
			log.Println("Consumer closed successfully")
		}
	}

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

	close(app.done)
	log.Println("Log consumer service shutdown complete")
}

func (app *Application) Wait() {
	<-app.done
}

func main() {
	config := defaultConfig()

	app := NewApplication(config)

	if err := app.Initialize(); err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := app.Start(); err != nil {
			log.Printf("Application error: %v", err)
			app.cancel()
		}
	}()

	sig := <-sigCh
	log.Printf("Received signal: %v", sig)

	app.Shutdown()
	app.Wait()
}

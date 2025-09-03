package internal

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/joho/godotenv/autoload"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Service interface {
	Close() error
	GetDB() *gorm.DB
	GetSQLDB() *sql.DB
	Health() error
}

type service struct {
	db    *gorm.DB
	sqlDB *sql.DB
}

var (
	database   = os.Getenv("DB_DATABASE")
	password   = os.Getenv("DB_PASSWORD")
	username   = os.Getenv("DB_USERNAME")
	port       = os.Getenv("DB_PORT")
	host       = os.Getenv("DB_HOST")
	schema     = os.Getenv("DB_SCHEMA")
	dbInstance *service
)

func New() Service {
	// Reuse Connection
	if dbInstance != nil {
		return dbInstance
	}

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&search_path=%s",
		username, password, host, port, database, schema)
	fmt.Println(connStr)
	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get underlying SQL DB:", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Printf("Connected to database: %s", database)

	dbInstance = &service{
		db:    db,
		sqlDB: sqlDB,
	}

	if err := dbInstance.migrate(); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	return dbInstance
}

func (s *service) GetDB() *gorm.DB {
	return s.db
}

func (s *service) GetSQLDB() *sql.DB {
	return s.sqlDB
}

func (s *service) Health() error {
	return s.sqlDB.Ping()
}

func (s *service) Close() error {
	log.Printf("Disconnected from database: %s", database)
	return s.sqlDB.Close()
}

func (s *service) migrate() error {
	return s.db.AutoMigrate(&User{}, &Product{}, &Log{}, &Downtime{}, &ProductQuickFix{})
}

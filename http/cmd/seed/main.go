package main

import (
	"flag"
	"http/internal/database"
	"log"
	"os"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	var force bool
	flag.BoolVar(&force, "force", false, "Force seeding even if data already exists")
	flag.Parse()

	log.Println("Starting database seeding...")

	// Initialize database connection
	db := database.New()
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Check database health
	if err := db.Health(); err != nil {
		log.Fatalf("Database health check failed: %v", err)
	}

	// Run migrations first to ensure tables exist
	log.Println("Running database migrations...")
	gormDB := db.GetDB()

	// Auto-migrate all models
	if err := gormDB.AutoMigrate(
		&database.User{},
		&database.Product{},
		&database.Log{},
		&database.Downtime{},
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Seed the database
	if err := database.SeedData(gormDB); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	log.Println("Database seeding completed successfully!")
	os.Exit(0)
}

package internal

import (
	"time"

	"github.com/google/uuid"
)

// These models mirror the schema owned by the http service. The agent-service
// only ever reads from these tables, so no migration hooks are defined here.

type User struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Username  string    `gorm:"size:255;not null;uniqueIndex" json:"username"`
	Email     string    `gorm:"size:255;not null;uniqueIndex" json:"email"`
	Name      string    `gorm:"size:255" json:"name"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
}

type Product struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	UserID      uint      `gorm:"not null" json:"user_id"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	AuthToken   uuid.UUID `gorm:"type:uuid" json:"-"`
	HealthAPI   string    `gorm:"type:text" json:"health_api"`
}

type Log struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint      `gorm:"not null;index" json:"product_id"`
	LogData   string    `gorm:"type:text;not null" json:"log_data"`
	Timestamp time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"timestamp"`
}

type Downtime struct {
	ID                 uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID          uint       `gorm:"not null;index" json:"product_id"`
	StartTime          time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"start_time"`
	EndTime            *time.Time `json:"end_time,omitempty"`
	Status             string     `gorm:"size:50;not null;default:'down'" json:"status"`
	IsNotificationSent bool       `gorm:"not null;default:false" json:"is_notification_sent"`
}

type ProductQuickFix struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	DowntimeID  uint      `gorm:"not null;index" json:"downtime_id"`
	ProductID   uint      `gorm:"not null;index" json:"product_id"`
	Title       string    `gorm:"size:255;not null" json:"title"`
	Description string    `gorm:"type:text;not null" json:"description"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
}

func (User) TableName() string            { return "users" }
func (Product) TableName() string         { return "products" }
func (Log) TableName() string             { return "logs" }
func (Downtime) TableName() string        { return "downtimes" }
func (ProductQuickFix) TableName() string { return "quick_fixes" }

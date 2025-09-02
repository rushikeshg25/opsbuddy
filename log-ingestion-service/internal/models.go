package internal

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Username    string    `gorm:"size:255;not null;uniqueIndex" json:"username"`
	Email       string    `gorm:"size:255;not null;uniqueIndex" json:"email"`
	Name        string    `gorm:"size:255" json:"name"`
	AvatarURL   string    `gorm:"size:500" json:"avatar_url"`
	Provider    string    `gorm:"size:50;default:'google'" json:"provider"`
	ProviderID  string    `gorm:"size:255" json:"provider_id"`
	AccessToken string    `gorm:"size:500" json:"access_token"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
	Products    []Product `gorm:"foreignKey:UserID" json:"products,omitempty"`
}

type Product struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	UserID      uint      `gorm:"not null" json:"user_id"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	User        User      `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	AuthToken   uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4()" json:"auth_token"`
	HealthAPI   string    `gorm:"type:text" json:"health_api"`
	Logs        []Log     `gorm:"constraint:OnDelete:CASCADE;"`
}

type Log struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint      `gorm:"not null;index" json:"product_id"`
	Product   Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	LogData   string    `gorm:"type:text;not null" json:"log_data"`
	Timestamp time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

type Downtime struct {
	ID                 uint              `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID          uint              `gorm:"not null;index" json:"product_id"`
	Product            Product           `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	StartTime          time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP" json:"start_time"`
	EndTime            *time.Time        `json:"end_time,omitempty"`
	Status             string            `gorm:"size:50;not null;default:'down'" json:"status"`
	IsNotificationSent bool              `gorm:"not null;default:false" json:"is_notification_sent"`
	QuickFixes         []ProductQuickFix `gorm:"constraint:OnDelete:CASCADE;" json:"quick_fixes,omitempty"`
}

type ProductQuickFix struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	DowntimeID  uint      `gorm:"not null;index" json:"downtime_id"`
	ProductID   uint      `gorm:"not null;index" json:"product_id"`
	Title       string    `gorm:"size:255;not null" json:"title"`
	Description string    `gorm:"type:text;not null" json:"description"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	Downtime    Downtime  `gorm:"foreignKey:DowntimeID" json:"downtime,omitempty"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (User) TableName() string {
	return "users"
}

func (Product) TableName() string {
	return "products"
}

func (Log) TableName() string { return "logs" }

func (Downtime) TableName() string { return "downtimes" }

func (ProductQuickFix) TableName() string { return "quick_fixes" }

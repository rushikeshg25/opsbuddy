package database

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
	Logs        []Log     `gorm:"constraint:OnDelete:CASCADE;"` // one-to-many relation
}

type Log struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint      `gorm:"not null;index" json:"product_id"` // foreign key with index
	Product   Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	LogData   string    `gorm:"type:text;not null" json:"log_data"` // renamed from 'Log' to avoid confusion
	Timestamp time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

func (User) TableName() string {
	return "users"
}

func (Product) TableName() string {
	return "products"
}

func (Log) TableName() string { return "logs" }

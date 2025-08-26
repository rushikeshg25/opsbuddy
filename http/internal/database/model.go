package database

import "time"

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
}

func (User) TableName() string {
	return "users"
}

func (Product) TableName() string {
	return "products"
}

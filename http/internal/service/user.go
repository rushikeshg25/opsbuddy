package service

import (
	"errors"
	"http/internal/database"
	"time"

	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) (*UserService, error) {
	return &UserService{
		db: db,
	}, nil
}

func (s *UserService) CreateUser(user database.User) (*database.User, error) {
	user.CreatedAt = time.Now()
	if user.Username == "" {
		return nil, errors.New("username is required")
	}
	if user.Email == "" {
		return nil, errors.New("email is required")
	}
	if user.Name == "" {
		return nil, errors.New("name is required")
	}
	if user.Provider == "" {
		return nil, errors.New("provider is required")
	}
	if user.ProviderID == "" {
		return nil, errors.New("provider ID is required")
	}
	if user.AccessToken == "" {
		return nil, errors.New("access token is required")
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

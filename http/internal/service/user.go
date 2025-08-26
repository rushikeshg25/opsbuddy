package service

import (
	"errors"
	"http/internal/database"
	"time"

	"github.com/markbates/goth"
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
	user.UpdatedAt = time.Now()

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

	if user.Username == "" {
		user.Username = user.Email
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *UserService) FindUserByProviderID(provider, providerID string) (*database.User, error) {
	var user database.User
	err := s.db.Where("provider = ? AND provider_id = ?", provider, providerID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (s *UserService) UpdateUser(user *database.User) error {
	user.UpdatedAt = time.Now()
	return s.db.Save(user).Error
}

func (s *UserService) FindOrCreateUser(gothUser goth.User) (*database.User, error) {

	existingUser, err := s.FindUserByProviderID(gothUser.Provider, gothUser.UserID)
	if err != nil {
		return nil, err
	}

	if existingUser != nil {
		// Update existing user's access token and other info
		existingUser.AccessToken = gothUser.AccessToken
		existingUser.Name = gothUser.Name
		existingUser.AvatarURL = gothUser.AvatarURL
		existingUser.UpdatedAt = time.Now()

		if err := s.UpdateUser(existingUser); err != nil {
			return nil, err
		}
		return existingUser, nil
	}

	newUser := database.User{
		Username:    gothUser.Email,
		Email:       gothUser.Email,
		Name:        gothUser.Name,
		AvatarURL:   gothUser.AvatarURL,
		Provider:    gothUser.Provider,
		ProviderID:  gothUser.UserID,
		AccessToken: gothUser.AccessToken,
	}

	return s.CreateUser(newUser)
}

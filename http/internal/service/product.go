package service

import (
	"errors"
	"http/internal/database"
	"strconv"
	"time"

	"gorm.io/gorm"
)

type ProductService struct {
	db *gorm.DB
}

func NewProductService(db *gorm.DB) (*ProductService, error) {
	if db == nil {
		return nil, errors.New("database connection cannot be nil")
	}
	return &ProductService{
		db: db,
	}, nil
}

func (s *ProductService) CreateProduct(product database.Product) (*database.Product, error) {
	product.CreatedAt = time.Now()

	if product.Name == "" {
		return nil, errors.New("product name is required")
	}
	if product.UserID == 0 {
		return nil, errors.New("user ID is required")
	}

	var user database.User
	if err := s.db.First(&user, product.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	if err := s.db.Create(&product).Error; err != nil {
		return nil, err
	}

	return &product, nil
}

func (s *ProductService) GetProduct(productID string) (*database.Product, error) {
	id, err := strconv.ParseUint(productID, 10, 32)
	if err != nil {
		return nil, errors.New("invalid product ID")
	}

	var product database.Product
	if err := s.db.Preload("User").First(&product, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}

	return &product, nil
}

func (s *ProductService) GetAllProducts() ([]database.Product, error) {
	var products []database.Product
	if err := s.db.Preload("User").Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}

func (s *ProductService) GetProductsByUser(userID uint) ([]database.Product, error) {
	var products []database.Product
	if err := s.db.Where("user_id = ?", userID).Preload("User").Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}

func (s *ProductService) UpdateProduct(productID string, updatedProduct database.Product) (*database.Product, error) {
	id, err := strconv.ParseUint(productID, 10, 32)
	if err != nil {
		return nil, errors.New("invalid product ID")
	}

	var product database.Product
	if err := s.db.First(&product, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}

	if updatedProduct.Name == "" {
		return nil, errors.New("product name is required")
	}

	updates := map[string]interface{}{
		"name":        updatedProduct.Name,
		"description": updatedProduct.Description,
		"updated_at":  time.Now(),
	}

	if err := s.db.Model(&product).Updates(updates).Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("User").First(&product, uint(id)).Error; err != nil {
		return nil, err
	}

	return &product, nil
}

func (s *ProductService) DeleteProduct(productID string) error {
	id, err := strconv.ParseUint(productID, 10, 32)
	if err != nil {
		return errors.New("invalid product ID")
	}

	var product database.Product
	if err := s.db.First(&product, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("product not found")
		}
		return err
	}

	if err := s.db.Delete(&product).Error; err != nil {
		return err
	}

	return nil
}

func (s *ProductService) DeleteProductsByUser(userID uint) error {
	if err := s.db.Where("user_id = ?", userID).Delete(&database.Product{}).Error; err != nil {
		return err
	}
	return nil
}

func (s *ProductService) SearchProducts(query string) ([]database.Product, error) {
	var products []database.Product
	searchQuery := "%" + query + "%"

	if err := s.db.Where("name ILIKE ? OR description ILIKE ?", searchQuery, searchQuery).
		Preload("User").Find(&products).Error; err != nil {
		return nil, err
	}

	return products, nil
}

func (s *ProductService) GetProductCount() (int64, error) {
	var count int64
	if err := s.db.Model(&database.Product{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (s *ProductService) GetProductCountByUser(userID uint) (int64, error) {
	var count int64
	if err := s.db.Model(&database.Product{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

package controller

import (
	"http/internal/service"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func NewUserController(db *gorm.DB, api *gin.RouterGroup) {
	_, err := service.NewUserService(db)
	if err != nil {
		log.Fatalf("Failed to create user service: %v", err)
	}

	// Register /me endpoint directly on the API group (will be /api/me)
	api.GET("/me", getUserName)
}

func getUserName(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		c.Abort()
		return
	}
	userClaims, ok := claims.(*service.Claims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	userName := userClaims.UserName
	c.JSON(http.StatusOK, gin.H{"user_name": userName})
}

package controller

import (
	"fmt"
	"http/internal/service"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"gorm.io/gorm"
)

var (
	GITHUB_CLIENT_ID     = os.Getenv("GITHUB_CLIENT_ID")
	GITHUB_CLIENT_SECRET = os.Getenv("GITHUB_CLIENT_SECRET")
	CALLBACK_URL         = "http://localhost:8080/auth/github/callback"
	JWT_SECRET           = os.Getenv("JWT_SECRET")
	SESSION_SECRET       = os.Getenv("SESSION_SECRET")
)

type AuthController struct {
	userService *service.UserService
}

func NewAuthController(db *gorm.DB, r *gin.Engine) *AuthController {
	if err := initOAuth(db); err != nil {
		log.Fatalf("Failed to initialize OAuth: %v", err)
	}
	userService, err := service.NewUserService(db)
	if err != nil {
		log.Fatalf("Failed to create user service: %v", err)
	}

	a := &AuthController{
		userService: userService,
	}

	authRouter := r.Group("/auth")
	{
		authRouter.GET("/github/callback", a.githubCallbackHandler)
		authRouter.GET("/github", a.loginHandler)
		authRouter.POST("/logout", a.logoutHandler)
		authRouter.GET("/me", a.getCurrentUser)
	}
	return a
}

func initOAuth(db *gorm.DB) error {
	// Set session secret for gothic
	if SESSION_SECRET == "" {
		return fmt.Errorf("SESSION_SECRET environment variable is required")
	}

	// Initialize session store
	store := sessions.NewCookieStore([]byte(SESSION_SECRET))
	store.MaxAge(86400 * 30) // 30 days
	store.Options.Path = "/"
	store.Options.HttpOnly = true
	store.Options.Secure = os.Getenv("APP_ENV") == "production"
	gothic.Store = store

	goth.UseProviders(
		github.New(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, CALLBACK_URL),
	)
	return nil
}

func (a *AuthController) loginHandler(c *gin.Context) {
	// Set the provider in the URL query or context
	q := c.Request.URL.Query()
	q.Add("provider", "github")
	c.Request.URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func (a *AuthController) githubCallbackHandler(c *gin.Context) {
	// Set the provider in the URL query for callback
	q := c.Request.URL.Query()
	if q.Get("provider") == "" {
		q.Add("provider", "github")
		c.Request.URL.RawQuery = q.Encode()
	}

	user, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authentication failed", "details": err.Error()})
		return
	}

	token, err := service.GenerateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Set secure cookie settings
	secure := os.Getenv("APP_ENV") == "production"
	c.SetCookie(
		"auth_token", // name
		token,        // value
		60*60*24*7,   // maxAge (7 days in seconds)
		"/",          // path
		"",           // domain (empty for current domain)
		secure,       // secure (true in production)
		true,         // httpOnly
	)

	// Redirect back to frontend after successful auth
	c.Redirect(http.StatusFound, "http://localhost:3000/dashboard") // or wherever you want to redirect
}

func (a *AuthController) logoutHandler(c *gin.Context) {
	c.SetCookie(
		"auth_token",
		"",    // value
		-1,    // maxAge (negative to expire immediately)
		"/",   // path
		"",    // domain
		false, // secure
		true,  // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (a *AuthController) getCurrentUser(c *gin.Context) {
	tokenString, err := c.Cookie("auth_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":         "Not authenticated",
			"authenticated": false,
		})
		return
	}

	claims, err := service.ValidateJWT(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":         "Invalid token",
			"message":       err.Error(),
			"authenticated": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":   claims.UserID,
			"name": claims.UserName,
		},
		"authenticated": true,
	})
}

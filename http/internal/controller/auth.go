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
	"github.com/markbates/goth/providers/google"
	"gorm.io/gorm"
)

var (
	GOOGLE_CLIENT_ID     = os.Getenv("GOOGLE_CLIENT_ID")
	GOOGLE_CLIENT_SECRET = os.Getenv("GOOGLE_CLIENT_SECRET")
	CALLBACK_URL         = "http://localhost:8080/auth/google/callback"
	JWT_SECRET           = os.Getenv("JWT_SECRET")
	SESSION_SECRET       = os.Getenv("SESSION_SECRET")
)

type AuthController struct {
	userService *service.UserService
}

func NewAuthController(db *gorm.DB, r *gin.Engine) *AuthController {
	if err := initOAuth(); err != nil {
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
		authRouter.GET("/google/callback", a.googleCallbackHandler)
		authRouter.GET("/google", a.loginHandler)
		authRouter.POST("/logout", a.logoutHandler)
	}
	return a
}

func initOAuth() error {
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
		google.New(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALLBACK_URL),
	)
	return nil
}

func (a *AuthController) loginHandler(c *gin.Context) {
	// Set the provider in the URL query or context
	q := c.Request.URL.Query()
	q.Add("provider", "google")
	c.Request.URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func (a *AuthController) googleCallbackHandler(c *gin.Context) {
	// Set the provider in the URL query for callback
	q := c.Request.URL.Query()
	if q.Get("provider") == "" {
		q.Add("provider", "google")
		c.Request.URL.RawQuery = q.Encode()
	}

	gothUser, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authentication failed", "details": err.Error()})
		return
	}

	// Debug
	log.Printf("Google OAuth user data: UserID=%s, Email=%s, Name=%s, NickName=%s, Provider=%s",
		gothUser.UserID, gothUser.Email, gothUser.Name, gothUser.NickName, gothUser.Provider)

	// Find or create user in database
	dbUser, err := a.userService.FindOrCreateUser(gothUser)
	if err != nil {
		log.Printf("Failed to find or create user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user", "details": err.Error()})
		return
	}

	token, err := service.GenerateJWTFromDBUser(dbUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
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

	c.Redirect(http.StatusFound, "http://localhost:3000/services")
}

func (a *AuthController) logoutHandler(c *gin.Context) {
	secure := os.Getenv("APP_ENV") == "production"

	c.SetCookie(
		"auth_token",
		"",     // value
		-1,     // maxAge (negative to expire immediately)
		"/",    // path
		"",     // domain
		secure, // secure (match login settings)
		true,   // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

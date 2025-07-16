package controller

import (
	"http/internal/service"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"gorm.io/gorm"
)

var (
	GITHUB_CLIENT_ID     = os.Getenv("GITHUB_CLIENT_ID")
	GITHUB_CLIENT_SECRET = os.Getenv("GITHUB_CLIENT_SECRET")
	CALLBACK_URL         = "http://localhost:3000/auth/github/callback"
	JWT_SECRET           = os.Getenv("JWT_SECRET")
	jwtSecret            = []byte(JWT_SECRET)
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
	}
	return a
}

func initOAuth(db *gorm.DB) error {
	goth.UseProviders(
		github.New(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, CALLBACK_URL),
	)
	return nil
}

func (a *AuthController) loginHandler(c *gin.Context) {
	// provider := c.Param("provider")
	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func (a *AuthController) githubCallbackHandler(c *gin.Context) {
	// provider := c.Param("provider")
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

	c.SetCookie(
		"auth_token", // name
		token,        // value
		60*60*24*7,   // maxAge (7 days in seconds)
		"/",          // path
		"",           // domain (empty for current domain)
		false,        // secure (set to true in production with HTTPS)
		true,         // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":         user.UserID,
			"email":      user.Email,
			"name":       user.Name,
			"avatar_url": user.AvatarURL,
			"provider":   user.Provider,
		},
	})
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

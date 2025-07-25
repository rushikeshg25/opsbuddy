package server

import (
	"http/internal/controller"
	"http/internal/database"
	"http/internal/middleware"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {

	db := database.New().GetDB()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.GET("/health", s.healthHandler)

	api := r.Group("/api")
	api.Use(middleware.JwtMiddleware())
	{
		controller.NewUserController(db, r)
		controller.NewProductController(db, r)
	}

	controller.NewAuthController(db, r)

	return r
}

func (s *Server) healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, "HEALTHY")
}

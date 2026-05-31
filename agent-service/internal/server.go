package internal

import (
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// NewRouter wires the agent HTTP routes, JWT auth and CORS.
func NewRouter(llm LLMProvider, db *Database) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins(),
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) { c.JSON(200, "HEALTHY") })

	h := NewHandler(llm, db)
	api := r.Group("/api/agent")
	api.Use(authMiddleware())
	{
		api.POST("/chat", h.chat)
	}

	return r
}

func corsOrigins() []string {
	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		return []string{"http://localhost:3000"}
	}
	parts := strings.Split(origins, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

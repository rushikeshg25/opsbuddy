package controller

import (
	"http/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AnalyticsController struct {
	analyticsService *service.AnalyticsService
}

func NewAnalyticsController(db *gorm.DB, api *gin.RouterGroup) *AnalyticsController {
	analyticsService, err := service.NewAnalyticsService(db)
	if err != nil {
		log.Fatalf("Failed to create analytics service: %v", err)
	}

	a := &AnalyticsController{
		analyticsService: analyticsService,
	}

	api.GET("/analytics/uptime", a.getUptimeStats)
	api.GET("/products/:product_id/uptime-stats", a.getProductUptimeStats)

	return a
}

func (a *AnalyticsController) getUptimeStats(c *gin.Context) {
	productIDStr := c.Query("product_id")
	if productIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Product ID is required",
			"message": "Please provide product_id query parameter",
		})
		return
	}

	productID, err := strconv.ParseUint(productIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid product ID",
			"message": err.Error(),
		})
		return
	}

	// Parse query parameters
	period := c.DefaultQuery("period", "30d")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	stats, err := a.analyticsService.GetUptimeStats(uint(productID), period, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch uptime stats",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    stats,
		"message": "Uptime stats fetched successfully",
	})
}

func (a *AnalyticsController) getProductUptimeStats(c *gin.Context) {
	productIDStr := c.Param("product_id")
	productID, err := strconv.ParseUint(productIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid product ID",
			"message": err.Error(),
		})
		return
	}

	// Parse query parameters
	period := c.DefaultQuery("period", "30d")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	stats, err := a.analyticsService.GetUptimeStats(uint(productID), period, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch uptime stats",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    stats,
		"message": "Uptime stats fetched successfully",
	})
}

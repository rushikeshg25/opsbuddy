package controller

import (
	"http/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DowntimeController struct {
	downtimeService *service.DowntimeService
}

func NewDowntimeController(db *gorm.DB, api *gin.RouterGroup) *DowntimeController {
	downtimeService, err := service.NewDowntimeService(db)
	if err != nil {
		log.Fatalf("Failed to create downtime service: %v", err)
	}
	
	d := &DowntimeController{
		downtimeService: downtimeService,
	}
	
	// Register routes
	api.GET("/downtime", d.getDowntime)
	api.GET("/products/:product_id/downtime", d.getProductDowntime)
	
	return d
}

func (d *DowntimeController) getDowntime(c *gin.Context) {
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
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")

	downtime, err := d.downtimeService.GetDowntime(uint(productID), startDate, endDate, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch downtime",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    downtime,
		"count":   len(downtime),
		"message": "Downtime fetched successfully",
	})
}

func (d *DowntimeController) getProductDowntime(c *gin.Context) {
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
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")

	downtime, err := d.downtimeService.GetDowntime(uint(productID), startDate, endDate, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch downtime",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    downtime,
		"count":   len(downtime),
		"message": "Downtime fetched successfully",
	})
}
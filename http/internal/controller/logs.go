package controller

import (
	"http/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LogsController struct {
	logsService *service.LogsService
}

func NewLogsController(db *gorm.DB, api *gin.RouterGroup) *LogsController {
	logsService, err := service.NewLogsService(db)
	if err != nil {
		log.Fatalf("Failed to create logs service: %v", err)
	}
	
	l := &LogsController{
		logsService: logsService,
	}
	
	// Register routes
	api.GET("/logs", l.getLogs)
	api.GET("/products/:product_id/logs", l.getProductLogs)
	
	return l
}

func (l *LogsController) getLogs(c *gin.Context) {
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
	limitStr := c.DefaultQuery("limit", "50")
	pageStr := c.DefaultQuery("page", "1")
	level := c.Query("level")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil {
		page = 1
	}

	logs, total, err := l.logsService.GetLogs(uint(productID), limit, page, level, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch logs",
			"message": err.Error(),
		})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"logs":        logs,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
		"message": "Logs fetched successfully",
	})
}

func (l *LogsController) getProductLogs(c *gin.Context) {
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
	limitStr := c.DefaultQuery("limit", "50")
	pageStr := c.DefaultQuery("page", "1")
	level := c.Query("level")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil {
		page = 1
	}

	logs, total, err := l.logsService.GetLogs(uint(productID), limit, page, level, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch logs",
			"message": err.Error(),
		})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"logs":        logs,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
		"message": "Logs fetched successfully",
	})
}
package controller

import (
	"http/internal/database"
	"http/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductController struct {
	productService *service.ProductService
}

func NewProductController(db *gorm.DB, api *gin.RouterGroup) *ProductController {
	productService, err := service.NewProductService(db)
	if err != nil {
		log.Fatalf("Failed to create product service: %v", err)
	}
	p := &ProductController{
		productService: productService,
	}
	// Register routes directly on the API group (will be /api/*)
	api.GET("/products", p.getAllProducts)
	api.GET("/products/:product_id", p.getProduct)
	api.POST("/products", p.createProduct)
	api.PUT("/products/:product_id", p.updateProduct)
	api.DELETE("/products/:product_id", p.deleteProduct)
	api.GET("/products/user/:user_id", p.getProductsByUser)
	api.GET("/products/search", p.searchProducts)
	api.GET("/products/count", p.getProductCount)
	return p
}

func (p *ProductController) getAllProducts(c *gin.Context) {
	products, err := p.productService.GetAllProducts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch products",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    products,
		"count":   len(products),
		"message": "Products fetched successfully",
	})
}

func (p *ProductController) getProduct(c *gin.Context) {
	productID := c.Param("product_id")

	product, err := p.productService.GetProduct(productID)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Product not found",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to fetch product",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    product,
		"message": "Product fetched successfully",
	})
}

func (p *ProductController) createProduct(c *gin.Context) {
	var product database.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
		return
	}

	// user, err := auth.GetUser(c)
	// if err != nil {
	//     c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
	//     return
	// }
	// product.UserID = user.UserID

	createdProduct, err := p.productService.CreateProduct(product)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "User not found",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to create product",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    createdProduct,
		"message": "Product created successfully",
	})
}

func (p *ProductController) updateProduct(c *gin.Context) {
	productID := c.Param("product_id")

	var updatedProduct database.Product
	if err := c.ShouldBindJSON(&updatedProduct); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
		return
	}

	product, err := p.productService.UpdateProduct(productID, updatedProduct)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Product not found",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to update product",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    product,
		"message": "Product updated successfully",
	})
}

func (p *ProductController) deleteProduct(c *gin.Context) {
	productID := c.Param("product_id")

	err := p.productService.DeleteProduct(productID)
	if err != nil {
		if err.Error() == "product not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Product not found",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to delete product",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Product deleted successfully",
	})
}

func (p *ProductController) getProductsByUser(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid user ID",
			"message": err.Error(),
		})
		return
	}

	products, err := p.productService.GetProductsByUser(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch user products",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    products,
		"count":   len(products),
		"message": "User products fetched successfully",
	})
}

func (p *ProductController) searchProducts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Search query is required",
			"message": "Please provide a search query parameter 'q'",
		})
		return
	}

	products, err := p.productService.SearchProducts(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Search failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    products,
		"count":   len(products),
		"query":   query,
		"message": "Products found successfully",
	})
}

func (p *ProductController) getProductCount(c *gin.Context) {
	count, err := p.productService.GetProductCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get product count",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   count,
		"message": "Product count fetched successfully",
	})
}

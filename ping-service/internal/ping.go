package internal

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"
)

const (
	DefaultPingInterval = 10 * time.Second
	MaxRetries          = 3
	BaseBackoffDelay    = 2 * time.Second
)

type PingService struct {
	db          Service
	heap        *PingHeap
	workerPool  *WorkerPool
	httpClient  *http.Client
	ctx         context.Context
	cancel      context.CancelFunc
	lastQueried time.Time
}

func NewPingService(db Service, workerCount int) *PingService {
	ctx, cancel := context.WithCancel(context.Background())

	ps := &PingService{
		db:   db,
		heap: NewPingHeap(),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		ctx:         ctx,
		cancel:      cancel,
		lastQueried: time.Now(),
	}

	ps.workerPool = NewWorkerPool(workerCount, ps)
	return ps
}

func (ps *PingService) Start() error {
	log.Println("Starting ping service...")

	if err := ps.loadProducts(); err != nil {
		return fmt.Errorf("failed to load products: %w", err)
	}

	ps.workerPool.Start()

	go ps.scheduler()

	go ps.periodicProductFetcher()

	log.Println("Ping service started successfully")
	return nil
}

func (ps *PingService) Stop() {
	log.Println("Stopping ping service...")
	ps.cancel()
	ps.workerPool.Stop()
	log.Println("Ping service stopped")
}

func (ps *PingService) loadProducts() error {
	var products []Product
	if err := ps.db.GetDB().Find(&products).Error; err != nil {
		return err
	}

	now := time.Now()
	for _, product := range products {
		if product.HealthAPI != "" {
			item := &PingItem{
				ProductID:  product.ID,
				HealthAPI:  product.HealthAPI,
				NextPingAt: now,
				RetryCount: 0,
				IsDown:     false,
			}
			ps.heap.SafePush(item)
		}
	}

	ps.lastQueried = now

	log.Printf("Loaded %d products for health checking", len(products))
	return nil
}

func (ps *PingService) scheduler() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ps.processReadyItems()
		case <-ps.ctx.Done():
			return
		}
	}
}

func (ps *PingService) processReadyItems() {
	now := time.Now()

	for {
		item := ps.heap.SafePeek()
		if item == nil || item.NextPingAt.After(now) {
			break
		}

		item = ps.heap.SafePop()
		ps.workerPool.SubmitJob(item)
	}
}

func (ps *PingService) processPing(item *PingItem) {
	success := ps.performHealthCheck(item.HealthAPI)

	if success {
		ps.handleSuccessfulPing(item)
	} else {
		ps.handleFailedPing(item)
	}
}

func (ps *PingService) performHealthCheck(healthAPI string) bool {
	req, err := http.NewRequestWithContext(ps.ctx, "GET", healthAPI, nil)
	if err != nil {
		log.Printf("Failed to create request for %s: %v", healthAPI, err)
		return false
	}

	resp, err := ps.httpClient.Do(req)
	if err != nil {
		log.Printf("Failed to ping %s: %v", healthAPI, err)
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (ps *PingService) handleSuccessfulPing(item *PingItem) {
	log.Printf("Product %d health check successful", item.ProductID)

	// If service was down, mark it as up
	if item.IsDown {
		ps.markServiceUp(item.ProductID)
	}

	item.RetryCount = 0
	item.IsDown = false
	item.NextPingAt = time.Now().Add(DefaultPingInterval)

	ps.heap.SafePush(item)
}

func (ps *PingService) handleFailedPing(item *PingItem) {
	item.RetryCount++
	log.Printf("Product %d health check failed (attempt %d/%d)", item.ProductID, item.RetryCount, MaxRetries)

	if item.RetryCount < MaxRetries {
		backoffDelay := BaseBackoffDelay * time.Duration(1<<(item.RetryCount-1))
		item.NextPingAt = time.Now().Add(backoffDelay)
		ps.heap.SafePush(item)
	} else {
		log.Printf("Product %d marked as down after %d failed attempts", item.ProductID, MaxRetries)

		if !item.IsDown {
			ps.markServiceDown(item.ProductID)
		}

		item.IsDown = true
		item.RetryCount = 0
		item.NextPingAt = time.Now().Add(DefaultPingInterval)
		ps.heap.SafePush(item)
	}
}

func (ps *PingService) markServiceDown(productID uint) {
	downtime := Downtime{
		ProductID: productID,
		StartTime: time.Now(),
		Status:    "down",
	}

	if err := ps.db.GetDB().Create(&downtime).Error; err != nil {
		log.Printf("Failed to record downtime for product %d: %v", productID, err)
	} else {
		log.Printf("Recorded downtime for product %d", productID)
	}
}

func (ps *PingService) markServiceUp(productID uint) {
	now := time.Now()

	var downtime Downtime
	err := ps.db.GetDB().Where("product_id = ? AND end_time IS NULL", productID).
		Order("start_time DESC").
		First(&downtime).Error

	if err != nil {
		log.Printf("No active downtime record found for product %d: %v", productID, err)
		return
	}

	downtime.EndTime = &now
	downtime.Status = "up"

	if err := ps.db.GetDB().Save(&downtime).Error; err != nil {
		log.Printf("Failed to update downtime record for product %d: %v", productID, err)
	} else {
		log.Printf("Service %d is back up, downtime duration: %v",
			productID, now.Sub(downtime.StartTime))
	}
}

func (ps *PingService) periodicProductFetcher() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	log.Println("Started periodic product fetcher (runs every 1 minute)")

	for {
		select {
		case <-ticker.C:
			ps.fetchNewProducts()
		case <-ps.ctx.Done():
			log.Println("Periodic product fetcher stopped")
			return
		}
	}
}

func (ps *PingService) fetchNewProducts() {
	var newProducts []Product

	err := ps.db.GetDB().Where("created_at > ? AND health_api != ''", ps.lastQueried).
		Find(&newProducts).Error

	if err != nil {
		log.Printf("Error fetching new products: %v", err)
		return
	}

	if len(newProducts) == 0 {
		log.Println("No new products found")
		ps.lastQueried = time.Now()
		return
	}

	log.Printf("Found %d new products to add to ping queue", len(newProducts))

	now := time.Now()
	for _, product := range newProducts {
		if !ps.isProductInHeap(product.ID) {
			item := &PingItem{
				ProductID:  product.ID,
				HealthAPI:  product.HealthAPI,
				NextPingAt: now,
				RetryCount: 0,
				IsDown:     false,
			}
			ps.heap.SafePush(item)
			log.Printf("Added new product to ping queue: ID=%d, Name=%s, HealthAPI=%s",
				product.ID, product.Name, product.HealthAPI)
		}
	}

	ps.lastQueried = now
}

func (ps *PingService) isProductInHeap(productID uint) bool {
	ps.heap.mutex.RLock()
	defer ps.heap.mutex.RUnlock()

	for _, item := range ps.heap.items {
		if item.ProductID == productID {
			return true
		}
	}
	return false
}

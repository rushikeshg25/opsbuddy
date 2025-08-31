package internal

import (
	"context"
	"log"
	"sync"
)

type WorkerPool struct {
	workerCount int
	jobChan     chan *PingItem
	wg          sync.WaitGroup
	ctx         context.Context
	cancel      context.CancelFunc
	pingService *PingService
}

func NewWorkerPool(workerCount int, pingService *PingService) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &WorkerPool{
		workerCount: workerCount,
		jobChan:     make(chan *PingItem, workerCount*2), // buffered channel
		ctx:         ctx,
		cancel:      cancel,
		pingService: pingService,
	}
}

func (wp *WorkerPool) Start() {
	log.Printf("Starting worker pool with %d workers", wp.workerCount)

	for i := 0; i < wp.workerCount; i++ {
		wp.wg.Add(1)
		go wp.worker(i)
	}
}

func (wp *WorkerPool) Stop() {
	log.Println("Stopping worker pool...")
	wp.cancel()
	close(wp.jobChan)
	wp.wg.Wait()
	log.Println("Worker pool stopped")
}

func (wp *WorkerPool) SubmitJob(item *PingItem) {
	select {
	case wp.jobChan <- item:
	case <-wp.ctx.Done():
		// Pool is shutting down
		return
	}
}

func (wp *WorkerPool) worker(id int) {
	defer wp.wg.Done()
	log.Printf("Worker %d started", id)

	for {
		select {
		case job, ok := <-wp.jobChan:
			if !ok {
				log.Printf("Worker %d: job channel closed", id)
				return
			}

			log.Printf("Worker %d: processing ping for product %d", id, job.ProductID)
			wp.pingService.processPing(job)

		case <-wp.ctx.Done():
			log.Printf("Worker %d: context cancelled", id)
			return
		}
	}
}

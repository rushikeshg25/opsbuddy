package internal

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type ConsumerConfig struct {
	Brokers         []string
	Topic           string
	GroupID         string
	MinBytes        int
	MaxBytes        int
	MaxWait         time.Duration
	ReadLagInterval time.Duration
	CommitInterval  time.Duration
	MaxRetries      int
	RetryDelay      time.Duration
}

// DefaultConsumerConfig returns default configuration
func DefaultConsumerConfig() ConsumerConfig {
	return ConsumerConfig{
		MinBytes:        10e3,                   // 10KB - higher minimum for better batching
		MaxBytes:        50e6,                   // 50MB - increased for larger batches
		MaxWait:         500 * time.Millisecond, // Reduced wait time for faster processing
		ReadLagInterval: 10 * time.Second,       // More frequent lag checks
		CommitInterval:  5 * time.Second,        // More frequent commits
		MaxRetries:      3,
		RetryDelay:      500 * time.Millisecond, // Faster retry
	}
}

type Consumer struct {
	reader *kafka.Reader
	config ConsumerConfig
	ctx    context.Context
	cancel context.CancelFunc
	done   chan struct{}
}

func NewConsumer(brokers []string, topic, groupID string) *Consumer {
	config := DefaultConsumerConfig()
	config.Brokers = brokers
	config.Topic = topic
	config.GroupID = groupID

	ctx, cancel := context.WithCancel(context.Background())

	return &Consumer{
		config: config,
		ctx:    ctx,
		cancel: cancel,
		done:   make(chan struct{}),
	}
}

func NewConsumerWithConfig(config ConsumerConfig) *Consumer {
	ctx, cancel := context.WithCancel(context.Background())

	return &Consumer{
		config: config,
		ctx:    ctx,
		cancel: cancel,
		done:   make(chan struct{}),
	}
}

func (c *Consumer) initializeReader() error {
	c.reader = kafka.NewReader(kafka.ReaderConfig{
		Brokers:         c.config.Brokers,
		Topic:           c.config.Topic,
		GroupID:         c.config.GroupID,
		MinBytes:        c.config.MinBytes,
		MaxBytes:        c.config.MaxBytes,
		MaxWait:         c.config.MaxWait,
		ReadLagInterval: c.config.ReadLagInterval,
		CommitInterval:  c.config.CommitInterval,
		Logger:          kafka.LoggerFunc(log.Printf),
	})

	return nil
}

func (c *Consumer) Read(ctx context.Context, handler func(key, value string)) error {
	if err := c.initializeReader(); err != nil {
		return fmt.Errorf("failed to initialize reader: %w", err)
	}
	defer c.reader.Close()

	// Create a context that can be cancelled
	readCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Start a goroutine to handle shutdown signals
	go func() {
		select {
		case <-c.ctx.Done():
			log.Println("Consumer shutdown requested, stopping message reading...")
			cancel()
		case <-readCtx.Done():
			// Context was cancelled externally
		}
	}()

	log.Printf("Starting to consume messages from topic: %s, group: %s", c.config.Topic, c.config.GroupID)

	for {
		select {
		case <-readCtx.Done():
			log.Println("Message reading stopped")
			return nil
		default:
			// Continue reading messages
		}

		// Read message with timeout
		msg, err := c.reader.ReadMessage(readCtx)
		if err != nil {
			if readCtx.Err() != nil {
				// Context was cancelled, exit gracefully
				return nil
			}

			// Log the error and continue if it's recoverable
			log.Printf("Error reading message: %v", err)

			// Add delay before retrying
			time.Sleep(c.config.RetryDelay)
			continue
		}

		// Process message synchronously for better performance
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Panic in message handler: %v", r)
				}
			}()

			// Call the handler
			handler(string(msg.Key), string(msg.Value))
		}()
	}
}

func (c *Consumer) Close() error {
	log.Println("Closing Kafka consumer...")

	// Cancel the context to stop message reading
	c.cancel()

	// Close the reader if it exists
	if c.reader != nil {
		if err := c.reader.Close(); err != nil {
			log.Printf("Error closing reader: %v", err)
			return err
		}
	}

	// Signal completion
	close(c.done)
	log.Println("Kafka consumer closed successfully")
	return nil
}

func (c *Consumer) Wait() {
	<-c.done
}

func (c *Consumer) GetStats() (kafka.ReaderStats, error) {
	if c.reader == nil {
		return kafka.ReaderStats{}, fmt.Errorf("reader not initialized")
	}
	return c.reader.Stats(), nil
}

func (c *Consumer) IsHealthy() bool {
	if c.reader == nil {
		return false
	}

	_, err := c.GetStats()
	return err == nil
}

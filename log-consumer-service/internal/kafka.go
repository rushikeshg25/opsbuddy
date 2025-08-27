package internal

import (
	"context"
	"fmt"

	"github.com/segmentio/kafka-go"
)

type Consumer struct {
	reader *kafka.Reader
}

func NewConsumer(broker []string, topic, groupId string) *Consumer {
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:  broker,
			Topic:    topic,
			GroupID:  groupId,
			MinBytes: 1e3,  // 1KB
			MaxBytes: 10e6, // 10MB
		}),
	}
}

func (c *Consumer) Read(ctx context.Context, handler func(key, value string)) error {
	for {
		m, err := c.reader.ReadMessage(ctx)
		if err != nil {
			return fmt.Errorf("failed to read message: %w", err)
		}
		handler(string(m.Key), string(m.Value))
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}

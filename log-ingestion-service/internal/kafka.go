package internal

import (
	"context"
	"encoding/json"
	"fmt"

	pb "log-ingestion-service/proto"

	"github.com/segmentio/kafka-go"
)

type Producer struct {
	writer *kafka.Writer
}

func NewProducer(brokers []string, topic string) *Producer {
	return &Producer{
		writer: kafka.NewWriter(kafka.WriterConfig{
			Brokers:  brokers,
			Topic:    topic,
			Balancer: &kafka.RoundRobin{},
		}),
	}
}

func (p *Producer) Write(ctx context.Context, logs []*pb.LogEntry, key string) error {
	// Create a batch structure
	batch := struct {
		ProductID string `json:"product_id"`
		Logs      []struct {
			Timestamp string `json:"timestamp"`
			Message   string `json:"message"`
		} `json:"logs"`
	}{
		ProductID: key,
		Logs: make([]struct {
			Timestamp string `json:"timestamp"`
			Message   string `json:"message"`
		}, len(logs)),
	}

	// Convert protobuf logs to JSON structure
	for i, log := range logs {
		batch.Logs[i] = struct {
			Timestamp string `json:"timestamp"`
			Message   string `json:"message"`
		}{
			Timestamp: log.GetTimestamp(),
			Message:   log.GetMessage(),
		}
	}

	// Serialize the entire batch as JSON
	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %w", err)
	}

	// Send as a single message
	message := kafka.Message{
		Key:   []byte(key),
		Value: batchJSON,
	}

	return p.writer.WriteMessages(ctx, message)
}

func (p *Producer) Close() error {
	p.writer.Close()
	return nil
}

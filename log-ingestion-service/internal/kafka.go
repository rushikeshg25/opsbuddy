package internal

import (
	"context"
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
	messages := make([]kafka.Message, len(logs))

	for i, log := range logs {
		// You can serialize the log entry as JSON or keep as protobuf
		value := fmt.Sprintf(`{"timestamp":"%s","message":"%s"}`,
			log.GetTimestamp(), log.GetMessage())

		messages[i] = kafka.Message{
			Key:   []byte(key),
			Value: []byte(value),
		}
	}

	return p.writer.WriteMessages(ctx, messages...)
}

func (p *Producer) Close() error {
	p.writer.Close()
	return nil
}

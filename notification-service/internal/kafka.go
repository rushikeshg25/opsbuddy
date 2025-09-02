package internal

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type KafkaConsumer struct {
	reader *kafka.Reader
}

func NewKafkaConsumer(brokers []string, topic string, groupID string) *KafkaConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		Topic:          topic,
		GroupID:        groupID,
		MinBytes:       10e3, // 10KB
		MaxBytes:       10e6, // 10MB
		CommitInterval: time.Second,
		StartOffset:    kafka.LastOffset,
	})

	return &KafkaConsumer{
		reader: reader,
	}
}

func (kc *KafkaConsumer) ConsumeNotifications(ctx context.Context, handler func(NotificationEvent) error) error {
	log.Println("Starting Kafka consumer for notifications...")

	for {
		select {
		case <-ctx.Done():
			log.Println("Kafka consumer context cancelled")
			return ctx.Err()
		default:
			message, err := kc.reader.FetchMessage(ctx)
			if err != nil {
				log.Printf("Error fetching message: %v", err)
				continue
			}

			var event NotificationEvent
			if err := json.Unmarshal(message.Value, &event); err != nil {
				log.Printf("Error unmarshaling notification event: %v", err)
				if commitErr := kc.reader.CommitMessages(ctx, message); commitErr != nil {
					log.Printf("Error committing unparseable message: %v", commitErr)
				}
				continue
			}

			log.Printf("Received notification: ProductID=%d, EventType=%s", event.ProductID, event.EventType)

			if err := handler(event); err != nil {
				log.Printf("Error handling notification event: %v", err)
				continue
			}

			if err := kc.reader.CommitMessages(ctx, message); err != nil {
				log.Printf("Error committing message: %v", err)
			}
		}
	}
}

func (kc *KafkaConsumer) Close() error {
	log.Println("Closing Kafka consumer...")
	return kc.reader.Close()
}

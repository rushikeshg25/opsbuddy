package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type NotificationEvent struct {
	ProductID uint      `json:"product_id"`
	UserEmail string    `json:"user_email"`
	Timestamp time.Time `json:"timestamp"`
	EventType string    `json:"event_type"` // "service_down", "service_up"
	Message   string    `json:"message"`
}

type KafkaProducer struct {
	writer *kafka.Writer
}

func NewKafkaProducer(brokers []string, topic string) *KafkaProducer {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.RoundRobin{},
		RequiredAcks: kafka.RequireOne,
		Async:        false,
	}

	return &KafkaProducer{
		writer: writer,
	}
}

func (kp *KafkaProducer) SendNotification(ctx context.Context, event NotificationEvent) error {
	eventBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	message := kafka.Message{
		Key:   []byte(fmt.Sprintf("%d", event.ProductID)),
		Value: eventBytes,
		Time:  time.Now(),
	}

	err = kp.writer.WriteMessages(ctx, message)
	if err != nil {
		log.Printf("Failed to send notification to Kafka: %v", err)
		return err
	}

	log.Printf("Notification sent to Kafka: ProductID=%d, EventType=%s", event.ProductID, event.EventType)
	return nil
}

func (kp *KafkaProducer) Close() error {
	return kp.writer.Close()
}

package internal

import (
	"context"
	"fmt"
	"log"
	pb "log-ingestion-service/proto"
)

type Processor struct {
	redis *Redis
	db    *Database
	kafka *Producer
}

type LogBatch struct {
	ProductId int
	Logs      []*pb.LogEntry
}

func NewProcessor() (*Processor, error) {
	redis := NewRedisClient()

	db, err := NewDatabase()
	if err != nil {
		return nil, err
	}
	kafka := NewProducer([]string{"localhost:9094"}, "logs")

	return &Processor{
		redis: redis,
		db:    db,
		kafka: kafka,
	}, nil

}

func (p *Processor) ProcessLogs(ctx context.Context, req *pb.IngestEventRequest) error {
	// productIDStr := req.ServiceId
	productIDStr, err := p.redis.Get(req.AuthToken, ctx)
	if err == nil {
		if productIDStr != req.ServiceId {
			return fmt.Errorf("invalid service id: %s", req.ServiceId)
		}
	} else {
		var product Product
		if err := p.db.DB.Where("auth_token = ?", req.AuthToken).First(&product).Error; err != nil {
			return fmt.Errorf("invalid auth token: %w", err)
		}

		productIDStr = fmt.Sprintf("%d", product.ID)
		if productIDStr != req.ServiceId {
			return fmt.Errorf("invalid service id: %s", req.ServiceId)
		}

		if err := p.redis.Set(req.AuthToken, productIDStr, ctx); err != nil {
			log.Printf("Warning: failed to cache auth token in Redis: %v", err)
		}
	}

	err = p.kafka.Write(
		ctx,
		req.Logs,
		productIDStr,
	)
	if err != nil {
		return fmt.Errorf("failed to write logs to kafka: %w", err)
	}
	// fmt.Println("Successfully processed logs")
	return nil
}

func (p *Processor) Close() error {
	if p.db != nil {
		if err := p.db.Close(); err != nil {
			return err
		}
	}
	if p.redis != nil {
		if err := p.redis.Close(); err != nil {
			return err
		}
	}
	if p.kafka != nil {
		if err := p.kafka.Close(); err != nil {
			return err
		}
	}
	return nil
}

func (p *Processor) ProcessLogbatch(batch *LogBatch, authToken string) error {
	return nil
}

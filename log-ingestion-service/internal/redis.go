package internal

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	client *redis.Client
	TTL    time.Duration
}

func NewRedisClient() *Redis {
	if os.Getenv("REDIS_HOST") == "" {
		panic("REDIS_HOST environment variable not set")
	}
	if os.Getenv("REDIS_PORT") == "" {
		panic("REDIS_PORT environment variable not set")
	}
	if os.Getenv("REDIS_PASSWORD") == "" {
		panic("REDIS_PASSWORD environment variable not set")
	}
	if os.Getenv("REDIS_DB") == "" {
		panic("REDIS_DB environment variable not set")
	}
	rdb := redis.NewClient(
		&redis.Options{
			Addr:     fmt.Sprintf("%s:%s", os.Getenv("REDIS_HOST"), os.Getenv("REDIS_PORT")),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       0,
		},
	)
	return &Redis{
		client: rdb,
		TTL:    15 * time.Minute, // Cache auth tokens for 15 minutes
	}
}

func (r *Redis) Get(key string, ctx context.Context) (string, error) {
	val, err := r.client.Get(ctx, key).Result()
	return val, err
}

func (r *Redis) Set(key string, value string, ctx context.Context) error {
	_, err := r.client.Set(ctx, key, value, r.TTL).Result()
	return err
}

func (r *Redis) Close() error {
	return r.client.Close()
}

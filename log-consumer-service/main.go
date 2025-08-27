package main

import (
	"context"
	"fmt"
	"log"
	"log-consumer-service/internal"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	brokers := []string{"localhost:9092"}
	topic := "logs"
	groupId := "log-consumer-service"

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	consumer := internal.NewConsumer(brokers, topic, groupId)

	go func() {
		sigch := make(chan os.Signal, 1)
		signal.Notify(sigch, syscall.SIGINT, syscall.SIGTERM)
		<-sigch
		fmt.Println("Shutting down consumers...")
		cancel()
		consumer.Close()
		log.Println("Consumers stopped")
	}()

	err := consumer.Read(ctx, func(key, value string) {
		fmt.Printf("Consumed message: %s\n", value)
	})
	if err != nil {
		log.Fatalf("Failed to read messages: %v", err)
	}

	<-ctx.Done()
}

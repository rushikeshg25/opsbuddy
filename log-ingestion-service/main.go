package main

import (
	"context"
	"log"

	"log-ingestion-service/internal"
	pb "log-ingestion-service/proto"
	"net"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/joho/godotenv/autoload"

	"google.golang.org/grpc"
)

type Server struct {
	pb.UnimplementedIngestionServiceServer
	processor *internal.Processor
}

func NewServer() (*Server, error) {
	processor, err := internal.NewProcessor()
	if err != nil {
		return nil, err
	}

	return &Server{
		processor: processor,
	}, nil
}

func (s *Server) IngestLogBatch(ctx context.Context, req *pb.IngestEventRequest) (*pb.IngestEventResponse, error) {
	err := s.processor.ProcessLogs(ctx, req)
	if err != nil {
		log.Printf("Error processing logs: %v", err)
		return &pb.IngestEventResponse{Success: false}, err
	}
	return &pb.IngestEventResponse{Success: true}, nil
}

func (s *Server) Close() error {
	if s.processor != nil {
		return s.processor.Close()
	}
	return nil
}

func main() {
	server, err := NewServer()
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}
	defer server.Close()

	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to start GRPC server: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterIngestionServiceServer(grpcServer, server)

	go func() {
		log.Printf("GRPC server listening on %v", listener.Addr())
		if err := grpcServer.Serve(listener); err != nil {
			log.Fatalf("Failed to serve: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	grpcServer.GracefulStop()
	log.Println("Server stopped")
}

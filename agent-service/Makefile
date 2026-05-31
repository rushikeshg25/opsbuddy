run:
	@echo "Starting agent service..."
	@go run main.go

build:
	@echo "Building agent service..."
	@go build -o bin/agent-service main.go

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf bin/

test:
	@echo "Running tests..."
	@go test ./...

.PHONY: run build clean test

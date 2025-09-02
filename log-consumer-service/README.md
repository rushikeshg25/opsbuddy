# Log Consumer Service

A robust, production-ready Kafka consumer service that processes log messages and stores them in TimescaleDB with enhanced features for monitoring, health checks, and graceful shutdown.

## Features

- **High-Performance Kafka Consumer**: Efficiently consumes log messages from Kafka topics
- **TimescaleDB Integration**: Stores logs in TimescaleDB hypertables for time-series analytics
- **Graceful Shutdown**: Proper cleanup of resources on service termination
- **Health Monitoring**: Built-in health check endpoints for monitoring systems
- **Metrics & Statistics**: Comprehensive metrics and statistics endpoints
- **Connection Pooling**: Optimized database connection management
- **Retry Logic**: Automatic retry mechanisms for transient failures
- **Configuration Management**: Environment-based configuration with sensible defaults
- **Error Handling**: Comprehensive error handling and logging

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=opsbuddy
DB_PORT=5433
DB_SSLMODE=disable

# Kafka Configuration
KAFKA_BROKERS=localhost:9094
KAFKA_TOPIC=logs
KAFKA_GROUP_ID=log-consumer-service

```

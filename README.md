# OpsBuddy


**OpsBuddy** is a comprehensive microservices monitoring platform that provides real-time health monitoring, intelligent log analysis, and automated incident response with Quickfixes. 

## Architecture Overview

OpsBuddy consists of several interconnected microservices:

<img width="2691" height="1001" alt="image" src="https://github.com/user-attachments/assets/8ba09c36-7dbe-4897-bc5c-8004a685b844" />


## Features

### Core Monitoring
- **Real-time Health Checks**: Continuous monitoring of service endpoints
- **Downtime Tracking**: Automatic detection and recording of service failures
- **Log Aggregation**: Centralized log collection via gRPC SDK
- **Performance Metrics**: Response time and availability monitoring

### AI-Powered Analysis
- **Intelligent Quick Fixes**: Gemini AI analyzes logs to suggest actionable solutions
- **Pattern Recognition**: Identifies common failure patterns (DB timeouts, memory issues, etc.)
- **Context-Aware Suggestions**: Uses service descriptions for targeted recommendations

### Alerting & Notifications
- **Email Notifications**: Instant alerts for service down/up events
- **Rich Analysis**: Includes AI-generated summaries and quick fixes
- **Customizable Templates**: Professional email formatting with actionable insights

### Developer Experience
- **Multi-language SDKs**: TypeScript/Node.js and Go SDK support
- **Easy Integration**: Simple gRPC-based log ingestion
- **Demo Applications**: Working and failing apps for testing

## 📁 Project Structure

```
opsbuddy/
├── demo/                         # Demo application
│   ├── working-app/              # Healthy service example
│   └── failing-app/              # Failing service example
├── sdk/                          # Client SDKs
│   ├── nodejs/                   # TypeScript/Node.js SDK
│   └── go/                       # Go SDK
├── services/
│   ├── ping-service/             # Health monitoring service
│   ├── notification-service/     # AI analysis & alerts
│   ├── log-consumer-service/     # Log processing
│   ├── log-ingestion-service/    # gRPC log ingestion
│   └── http/                     # REST API service
├── ui/                           # Frontend dashboard
├── scripts/                      # Install Postgres extensions and creation Kafka topics
├── docker-compose.yml            # Infrastructure setup
└── README.md                    
```




## SDK Integration

### Node.js/TypeScript
```typescript
import { OpsBuddySDK } from 'opsbuddy-sdk';

const sdk = new OpsBuddySDK({
  serviceId: "my-service",
  authToken: "your-token",
  grpcEndpoint: "localhost:50051"
});

sdk.startIntercepting(); // Auto-capture console logs
```
### Go
```Work in progress```

## Alerting

### Email Notifications
- **Service Down**: Immediate alerts with AI analysis and quick fixes
- **Service Recovery**: Confirmation with downtime duration

### Notification Flow
1. Ping service detects failure → Creates downtime record
2. Kafka event triggers notification service  
3. AI analyzes last 20 logs + service context
4. Email sent with summary + prioritized quick fixes

## Performance

### Optimizations
- **Batch Log Processing**: Handles high-volume log ingestion
- **Connection Pooling**: Optimized database connections  
- **Async Processing**: Non-blocking notification handling
- **Graceful Degradation**: Continues operation during component failures

### Scalability
- **Horizontal Scaling**: Stateless services support multiple instances
- **Kafka Partitioning**: Distributes load across consumers
- **TimescaleDB**: Optimized for time-series data at scale


## Proto Generation

Nodejs Proto generation

```bash
#in /sdk
protoc \
  --plugin=./nodejs/node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./nodejs/src/proto \
  --ts_proto_opt=esModuleInterop=true,outputServices=grpc-js \
  -I ./proto \
  ./proto/ingestion.proto
```

Go Proto generation

```bash
# in /sdk/go
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --js_out=import_style=commonjs,binary:../ts --ts_out=../ts --proto_path=../proto ../proto/ingestion.proto
```

## V1 Architecture

<img width="1188" height="591" alt="image" src="https://github.com/user-attachments/assets/66fb4597-e8b2-4162-af7e-3900def2a591" />

## Performance and interface update

The `perf/optimized-ui` branch contains ten performance commits followed by ten UI commits.
Open [the interactive report](docs/optimization-explainer.html) locally for measured results, the commit sequence, and validation limits.

Install dependencies with `bun install` in `ui` and `sdk/node`. Run `scripts/check.sh` from the repository root to check the Go modules, SDK, and UI. PostgreSQL integration tests run when `OPSBUDDY_TEST_DSN` points to a disposable PostgreSQL 14+ database; otherwise those tests skip.

Apply `migrations/001_read_path_indexes.sql` after the schema exists. Schedule this migration off-peak because TimescaleDB index creation can block writes. Run representative load tests before deployment; the local measurements are not production throughput guarantees.

For a UI-only preview without infrastructure:

1. Run `python3 scripts/preview-api.py` from the repository root. This serves synthetic data on port 8080 and stores nothing permanently.
2. Run `bun run dev --port 3100` in `ui` and open `http://localhost:3100`.
3. Stop the fixture API before starting the real API. Do not expose the fixture server publicly.

Set `NEXT_PUBLIC_API_URL` to your real API origin for other environments. Kafka delivery remains at least once; replay can duplicate a persisted batch. The SDK buffers up to 10,000 captured records by default and counts records dropped when the queue is full.

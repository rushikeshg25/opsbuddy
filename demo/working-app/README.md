# OpsBuddy Demo - Working App

This is a demo application that simulates a healthy service for OpsBuddy monitoring.

## Features

- **Health Endpoint**: Always returns 200 status with "healthy" response
- **Background Logging**: Continuously generates positive log messages using console.log/console.warn
- **OpsBuddy SDK Integration**: Automatically captures and batches console logs, sends via gRPC

## Running the App

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run
npm run build
npm start
```

The app will run on port 3000 by default.

## Endpoints

- `GET /health` - Health check endpoint (always returns healthy)

## Environment Variables

- `PORT` - Server port (default: 3000)
- `OPSBUDDY_ENDPOINT` - OpsBuddy gRPC endpoint (default: localhost:50051)
- `OPSBUDDY_SERVICE_ID` - Service ID in OpsBuddy (default: 1)
- `OPSBUDDY_AUTH_TOKEN` - Authentication token (default: demo-token-123)

## Log Types

This app generates positive logs using console.log() and console.warn() including:
- User authentication successful
- Database queries executed successfully
- Cache hits
- API requests processed quickly
- Background jobs completed
- Health checks passed
- Normal memory usage
- Service responses normal

All console output is automatically captured by the OpsBuddy SDK and sent via gRPC in batches.
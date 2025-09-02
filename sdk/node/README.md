# OpsBuddy Node.js SDK

A Node.js SDK for sending logs to OpsBuddy log ingestion service via gRPC.

## Installation

```bash
npm install opsbuddy-sdk
```

## Usage

### Basic Usage

```javascript
import { OpsBuddySDK } from 'opsbuddy-sdk';

const sdk = new OpsBuddySDK({
  serviceId: '123',
  authToken: 'your-auth-token-uuid',
  grpcEndpoint: 'localhost:50051', // Optional, defaults to localhost:50051
  batchSize: 100,                  // Optional, defaults to 100
  flushInterval: 5000             // Optional, defaults to 5000ms
});

// Send individual log
await sdk.ingestLog('User logged in successfully', 'INFO');

// Send multiple logs
await sdk.ingestLogs([
  {
    message: 'Database connection established',
    level: 'INFO',
    timestamp: new Date().toISOString()
  },
  {
    message: 'Cache miss for user:123',
    level: 'WARN',
    timestamp: new Date().toISOString()
  }
]);
```

### Console Interception

Automatically capture and send console logs:

```javascript
import { OpsBuddySDK } from 'opsbuddy-sdk';

const sdk = new OpsBuddySDK({
  serviceId: '123',
  authToken: 'your-auth-token-uuid'
});

// Start intercepting console logs
sdk.startIntercepting();

// These will be automatically captured and sent to OpsBuddy
console.log('This will be sent to OpsBuddy');
console.error('This error will also be sent');
console.warn('Warning message');

// Stop intercepting when done
sdk.stopIntercepting();

// Clean up
await sdk.close();
```

### Express.js Integration

```javascript
import express from 'express';
import { OpsBuddySDK } from 'opsbuddy-sdk';

const app = express();
const sdk = new OpsBuddySDK({
  serviceId: process.env.OPSBUDDY_SERVICE_ID,
  authToken: process.env.OPSBUDDY_AUTH_TOKEN,
  grpcEndpoint: process.env.OPSBUDDY_ENDPOINT || 'localhost:50051'
});

// Start console interception
sdk.startIntercepting();

app.get('/api/users', async (req, res) => {
  try {
    console.log('Fetching users'); // Automatically sent to OpsBuddy
    
    // Your business logic
    const users = await getUsersFromDB();
    
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error); // Automatically sent to OpsBuddy
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sdk.close();
  process.exit(0);
});

app.listen(3000);
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serviceId` | string | Required | Your service ID from OpsBuddy dashboard |
| `authToken` | string | Required | Your auth token from OpsBuddy dashboard |
| `grpcEndpoint` | string | `localhost:50051` | gRPC endpoint of OpsBuddy ingestion service |
| `batchSize` | number | `100` | Number of logs to batch before sending |
| `flushInterval` | number | `5000` | Interval in ms to flush logs automatically |

## API Reference

### `OpsBuddySDK`

#### Constructor
- `new OpsBuddySDK(config: OpsBuddyConfig)`

#### Methods
- `startIntercepting()`: Start capturing console logs
- `stopIntercepting()`: Stop capturing console logs
- `ingestLog(message: string, level?: string, timestamp?: string)`: Send single log
- `ingestLogs(logs: CapturedLog[])`: Send multiple logs
- `getCapturedLogs()`: Get currently captured logs
- `close()`: Clean up and flush remaining logs

## Types

```typescript
interface OpsBuddyConfig {
  serviceId: string;
  authToken: string;
  grpcEndpoint?: string;
  batchSize?: number;
  flushInterval?: number;
}

interface CapturedLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}
```

## License

ISC
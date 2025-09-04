import express from 'express';
import { OpsBuddySDK } from 'opsbuddy-sdk';

const app = express();
const port = process.env.PORT || 3500;

const sdk = new OpsBuddySDK({
  serviceId: process.env.OPSBUDDY_SERVICE_ID || '1',
  authToken:
    process.env.OPSBUDDY_AUTH_TOKEN || '2f8feadb-6262-4e74-a561-e0febfea5b7a',
  grpcEndpoint: process.env.OPSBUDDY_ENDPOINT || 'localhost:50051',
  batchSize: 10,
  flushInterval: 6000,
});

sdk.startIntercepting();

app.use(express.json());

app.get('/health', (_, res) => {
  res.status(200).json({
    status: 'healthy',
  });
});

function startBackgroundLogging() {
  const logMessages = [
    'User authentication successful',
    'Database query executed successfully',
    'Cache hit for user preferences',
    'API request processed in 45ms',
    'Background job completed successfully',
    'Health check passed',
    'Memory usage within normal limits',
    'All services responding normally',
    'Backup process completed',
    'Configuration reloaded successfully',
  ];

  setInterval(() => {
    const message = logMessages[Math.floor(Math.random() * logMessages.length)];
    const isWarning = Math.random() > 0.9;

    if (isWarning) {
      console.warn(message);
    } else {
      console.log(message);
    }
  }, 3000 + Math.random() * 2000);
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await sdk.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await sdk.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Working demo app running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`This app simulates a healthy service with regular logs`);
  startBackgroundLogging();
  console.log('Working app started successfully');
});

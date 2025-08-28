const { OpsBuddySDK } = require('./dist/index.js');

async function example() {
  // Initialize SDK
  const sdk = new OpsBuddySDK({
    serviceId: '123',
    authToken: 'your-auth-token-here',
    grpcEndpoint: 'localhost:50051',
    batchSize: 10,
    flushInterval: 2000,
  });

  console.log('OpsBuddy SDK initialized');

  // Start console interception
  sdk.startIntercepting();
  console.log('Console interception started');

  // These logs will be automatically captured and sent
  console.log('This is an info message');
  console.error('This is an error message');
  console.warn('This is a warning message');

  try {
    await sdk.ingestLog('Manual log entry', 'INFO');
    console.log('Manual log sent successfully');
  } catch (error) {
    console.error('Failed to send manual log:', error.me);
  }
}

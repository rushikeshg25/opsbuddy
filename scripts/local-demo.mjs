// Uses the built SDK in this checkout, not a published package.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { OpsBuddySDK } = require('../sdk/node/dist/index.js');
if (!process.env.OPSBUDDY_SERVICE_ID || !process.env.OPSBUDDY_AUTH_TOKEN) {
  throw new Error('Source .local/demo.env before starting the demo.');
}
const sdk = new OpsBuddySDK({
  serviceId: process.env.OPSBUDDY_SERVICE_ID,
  authToken: process.env.OPSBUDDY_AUTH_TOKEN,
  grpcEndpoint: 'localhost:50051',
  batchSize: 10,
  flushInterval: 5000,
});
let healthy = true;
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/fail') healthy = false;
  else if (req.method === 'POST' && req.url === '/recover') healthy = true;
  else if (req.method !== 'GET' || req.url !== '/health') {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(req.url === '/health' && !healthy ? 503 : 200, {'Content-Type':'application/json'});
  res.end(JSON.stringify({status:healthy ? 'healthy' : 'unhealthy'}));
});
const timer = setInterval(() => {
  sdk.ingestLog(healthy ? 'Local demo request completed' : 'Local demo dependency unavailable', healthy ? 'INFO' : 'ERROR')
    .catch(() => process.stderr.write('Local demo ingestion failed; inspect ingestion.log\n'));
}, 5000);
server.listen(3500, '127.0.0.1', () => console.log('Local demo: http://127.0.0.1:3500/health'));
async function close() {
  clearInterval(timer);
  server.close();
  await sdk.close();
}
process.once('SIGTERM', close);
process.once('SIGINT', close);

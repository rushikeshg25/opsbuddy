// OpsBuddy Node.js SDK
export * from './proto/ingestion';
import { credentials, type ChannelCredentials } from '@grpc/grpc-js';
import {
  IngestionServiceClient,
  type IngestEventRequest,
  type IngestEventResponse,
  type LogEntry,
} from './proto/ingestion';

export interface OpsBuddyConfig {
  serviceId: string;
  authToken: string;
  grpcEndpoint?: string;
  batchSize?: number;
  flushInterval?: number;
}

export interface CapturedLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

export class OpsBuddySDK {
  private config: Required<OpsBuddyConfig>;
  private client!: IngestionServiceClient;
  private capturedLogs: CapturedLog[] = [];
  private originalConsole: any = {};
  private flushTimer?: NodeJS.Timeout;
  private isIntercepting = false;

  constructor(config: OpsBuddyConfig) {
    this.config = {
      grpcEndpoint: 'localhost:50051',
      batchSize: 100,
      flushInterval: 5000,
      ...config,
    };

    this.setupGRPCClient();
    this.startBatching();
  }

  private setupGRPCClient() {
    const creds: ChannelCredentials = this.config.grpcEndpoint.includes(
      'localhost'
    )
      ? credentials.createInsecure()
      : credentials.createSsl();

    this.client = new IngestionServiceClient(this.config.grpcEndpoint, creds);
  }

  private startBatching() {
    this.flushTimer = setInterval(() => {
      if (this.capturedLogs.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  startIntercepting() {
    if (this.isIntercepting) return;

    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    console.log = (...args: any[]) => {
      this.capture('INFO', args);
      this.originalConsole.log(...args);
    };

    console.error = (...args: any[]) => {
      this.capture('ERROR', args);
      this.originalConsole.error(...args);
    };

    console.warn = (...args: any[]) => {
      this.capture('WARN', args);
      this.originalConsole.warn(...args);
    };

    console.info = (...args: any[]) => {
      this.capture('INFO', args);
      this.originalConsole.info(...args);
    };

    console.debug = (...args: any[]) => {
      this.capture('DEBUG', args);
      this.originalConsole.debug(...args);
    };

    this.isIntercepting = true;
  }

  stopIntercepting() {
    if (!this.isIntercepting) return;

    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;

    this.isIntercepting = false;
  }

  private capture(level: string, args: any[]) {
    const message = args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(' ');

    const logEntry: CapturedLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: {
        source: 'console',
        timestamp_ms: Date.now(),
      },
    };

    this.capturedLogs.push(logEntry);

    if (this.capturedLogs.length >= this.config.batchSize) {
      this.flush();
    }
  }

  async ingestLogs(logs: CapturedLog[]): Promise<IngestEventResponse> {
    const logEntries: LogEntry[] = logs.map((log) => ({
      timestamp: log.timestamp,
      message: `[${log.level}] ${log.message}`,
    }));

    const request: IngestEventRequest = {
      logs: logEntries,
      serviceId: this.config.serviceId,
      authToken: this.config.authToken,
    };

    return new Promise<IngestEventResponse>((resolve, reject) => {
      this.client.ingestLogBatch(request, (error, response) => {
        if (error) {
          reject(error);
        } else if (response) {
          resolve(response);
        } else {
          reject(new Error('No response received'));
        }
      });
    });
  }

  async ingestLog(
    message: string,
    level: string = 'INFO',
    timestamp?: string
  ): Promise<IngestEventResponse> {
    const log: CapturedLog = {
      message,
      level,
      timestamp: timestamp || new Date().toISOString(),
    };

    return this.ingestLogs([log]);
  }

  private async flush() {
    if (this.config.flushInterval <= 5000) {
      console.warn('flushInterval is less than 5000 ms, skipping flush');
      return;
    }
    if (this.capturedLogs.length === 0) return;

    const logsToSend = [...this.capturedLogs];
    this.capturedLogs = [];

    try {
      await this.ingestLogs(logsToSend);
    } catch (error) {
      console.error('Failed to send logs to OpsBuddy:', error);
    }
  }

  getCapturedLogs(): CapturedLog[] {
    return [...this.capturedLogs];
  }

  async close() {
    this.stopIntercepting();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.capturedLogs.length > 0) {
      try {
        await this.flush();
      } catch (error) {
        console.error('Failed to flush remaining logs during close:', error);
      }
    }

    this.client.close();
  }
}

export default OpsBuddySDK;

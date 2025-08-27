import { credentials } from '@grpc/grpc-js';
import { 
  IngestionServiceClient, 
  IngestEventRequest, 
  IngestEventResponse, 
  LogEntry 
} from './proto/ingestion';

export interface OpsBuddyConfig {
  serviceId: string;
  authToken: string;
  endpoint?: string;
}

export class OpsBuddyClient {
  private client: IngestionServiceClient;
  private config: OpsBuddyConfig;

  constructor(config: OpsBuddyConfig) {
    this.config = config;
    const endpoint = config.endpoint || 'localhost:50051';
    
    this.client = new IngestionServiceClient(
      endpoint,
      credentials.createInsecure()
    );
  }

  async ingestLogs(logs: LogEntry[]): Promise<IngestEventResponse> {
    const request: IngestEventRequest = {
      logs,
      serviceId: this.config.serviceId,
      authToken: this.config.authToken,
    };

    return new Promise((resolve, reject) => {
      this.client.ingestLogBatch(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response!);
        }
      });
    });
  }

  async ingestLog(message: string, timestamp?: string): Promise<IngestEventResponse> {
    const logEntry: LogEntry = {
      message,
      timestamp: timestamp || new Date().toISOString(),
    };

    return this.ingestLogs([logEntry]);
  }
}
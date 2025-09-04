// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
  provider_id: string;
  created_at: string;
  updated_at: string;
}

// Product/Service Types
export interface Product {
  id: number;
  name: string;
  description: string;
  user_id: number;
  auth_token: string;
  health_api: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  health_api: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  health_api?: string;
}

// Log Types
export interface Log {
  id: number;
  product_id: number;
  log_data: string;
  Timestamp: string;
}

export interface LogsResponse {
  logs: Log[];
  total: number;
  page: number;
  limit: number;
}

export interface LogsQuery {
  product_id: number;
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  level?: string;
}

export interface Quickfix {
  id: number;
  product_id: number;
  downtime_id: number;
  title: string;
  description: string;
  created_at: string;
}

export interface QuickFixesQuery {
  product_id: number;
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  level?: string;
}

export interface QuickFixesResponse {
  quickfixes: Quickfix[];
  total: number;
  page: number;
  limit: number;
}

// Downtime Types
export interface Downtime {
  id: number;
  product_id: number;
  start_time: string;
  end_time?: string;
  status: 'down' | 'degraded';
  is_notification_sent: boolean;
}

export interface DowntimeQuery {
  product_id: number;
  start_date?: string;
  end_date?: string;
  status?: 'down' | 'degraded';
}

// Analytics Types
export interface UptimeStats {
  product_id: number;
  uptime_percentage: number;
  total_downtime_minutes: number;
  incident_count: number;
  period_start: string;
  period_end: string;
}

export interface AnalyticsQuery {
  product_id: number;
  period?: '24h' | '7d' | '30d' | '90d';
  start_date?: string;
  end_date?: string;
}

// Health Check Types
export interface HealthCheckResult {
  product_id: number;
  status: 'up' | 'down' | 'degraded';
  response_time_ms?: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
}

// Error Types
export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface NetworkError {
  type: 'network' | 'timeout' | 'abort';
  message: string;
}

export interface AuthError {
  type: 'unauthorized' | 'forbidden' | 'expired';
  message: string;
}

export type AppError = ApiError | ValidationError | NetworkError | AuthError;

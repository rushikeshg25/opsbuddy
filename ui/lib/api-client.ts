import {
  ApiResponse,
  ApiError,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  LogsResponse,
  LogsQuery,
  Downtime,
  DowntimeQuery,
  UptimeStats,
  AnalyticsQuery,
  HealthCheckResult,
  QuickFixesQuery,
  QuickFixesResponse,
} from '@/lib/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
  constructor(private baseURL: string = API_BASE_URL) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        credentials: 'include',
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: errorData.error || errorData.message || response.statusText,
          details: errorData,
        } as ApiError;
      }

      return response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }
      throw {
        status: 0,
        message: 'Network error occurred',
        details: error,
      } as ApiError;
    }
  }

  private buildParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    return searchParams.toString();
  }

  // Products API
  async getProducts(): Promise<Product[]> {
    const response = await this.request<ApiResponse<Product[]>>(
      '/api/products'
    );
    return response.data ?? [];
  }

  async getProduct(id: number): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>(
      `/api/products/${id}`
    );
    return response.data!;
  }

  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async updateProduct(
    id: number,
    data: UpdateProductRequest
  ): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>(
      `/api/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data!;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.request(`/api/products/${id}`, { method: 'DELETE' });
  }

  // Logs API
  async getLogs(query: LogsQuery): Promise<LogsResponse> {
    const params = this.buildParams(query);
    const response = await this.request<ApiResponse<LogsResponse>>(
      `/api/logs?${params}`
    );
    return response.data ?? { logs: [], total: 0, page: 1, limit: 50 };
  }

  async getQuickFixes(query: QuickFixesQuery): Promise<QuickFixesResponse> {
    const params = this.buildParams(query);
    const response = await this.request<ApiResponse<QuickFixesResponse>>(
      `/api/quick-fixes?${params}`
    );
    return response.data ?? { quickfixes: [], total: 0, page: 1, limit: 9 };
  }

  // Downtime API
  async getDowntime(query: DowntimeQuery): Promise<Downtime[]> {
    const params = this.buildParams(query);
    const response = await this.request<ApiResponse<Downtime[]>>(
      `/api/downtime?${params}`
    );
    return response.data ?? [];
  }

  // Analytics API
  async getUptimeStats(query: AnalyticsQuery): Promise<UptimeStats> {
    const params = this.buildParams(query);
    const response = await this.request<ApiResponse<UptimeStats>>(
      `/api/analytics/uptime?${params}`
    );
    return response.data!;
  }

  // Health Check API
  async triggerHealthCheck(productId: number): Promise<HealthCheckResult> {
    const response = await this.request<ApiResponse<HealthCheckResult>>(
      `/api/products/${productId}/health-check`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;

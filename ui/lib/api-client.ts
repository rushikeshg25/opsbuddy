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
  HealthCheckResult
} from './types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for auth
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          status: response.status,
          message: errorData.error || errorData.message || response.statusText,
          details: errorData,
        };
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw error; // Re-throw API errors
      }
      
      // Handle network errors
      const networkError: ApiError = {
        status: 0,
        message: 'Network error occurred',
        details: error,
      };
      throw networkError;
    }
  }

  // Generic HTTP methods
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return this.request<T>(url.pathname + url.search);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Products/Services API
  async getProducts(): Promise<Product[]> {
    const response = await this.request<ApiResponse<Product[]>>('/api/products');
    return response.data ?? [];
  }

  async getProduct(id: number): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>(`/api/products/${id}`);
    if (!response.data) {
      throw new Error('Product not found');
    }
    return response.data;
  }

  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to create product');
    }
    return response.data;
  }

  async updateProduct(id: number, data: UpdateProductRequest): Promise<Product> {
    const response = await this.request<ApiResponse<Product>>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to update product');
    }
    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Logs API
  async getLogs(query: LogsQuery): Promise<LogsResponse> {
    const params = new URLSearchParams();
    params.append('product_id', query.product_id.toString());
    
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.start_date) params.append('start_date', query.start_date);
    if (query.end_date) params.append('end_date', query.end_date);
    if (query.level) params.append('level', query.level);

    const response = await this.request<ApiResponse<LogsResponse>>(`/api/logs?${params}`);
    return response.data ?? { logs: [], total: 0, page: 1, limit: 50 };
  }

  // Downtime API
  async getDowntime(query: DowntimeQuery): Promise<Downtime[]> {
    const params = new URLSearchParams();
    params.append('product_id', query.product_id.toString());
    
    if (query.start_date) params.append('start_date', query.start_date);
    if (query.end_date) params.append('end_date', query.end_date);
    if (query.status) params.append('status', query.status);

    const response = await this.request<ApiResponse<Downtime[]>>(`/api/downtime?${params}`);
    return response.data ?? [];
  }

  // Analytics API
  async getUptimeStats(query: AnalyticsQuery): Promise<UptimeStats> {
    const params = new URLSearchParams();
    params.append('product_id', query.product_id.toString());
    
    if (query.period) params.append('period', query.period);
    if (query.start_date) params.append('start_date', query.start_date);
    if (query.end_date) params.append('end_date', query.end_date);

    const response = await this.request<ApiResponse<UptimeStats>>(`/api/analytics/uptime?${params}`);
    if (!response.data) {
      throw new Error('Failed to fetch uptime stats');
    }
    return response.data;
  }

  // Health Check API
  async triggerHealthCheck(productId: number): Promise<HealthCheckResult> {
    const response = await this.request<ApiResponse<HealthCheckResult>>(`/api/products/${productId}/health-check`, {
      method: 'POST',
    });
    if (!response.data) {
      throw new Error('Failed to trigger health check');
    }
    return response.data;
  }

  async getHealthCheckHistory(productId: number, limit: number = 100): Promise<{ items: HealthCheckResult[] }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    const response = await this.request<ApiResponse<{ items: HealthCheckResult[] }>>(`/api/products/${productId}/health-checks?${params}`);
    return response.data ?? { items: [] };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
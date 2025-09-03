import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  AnalyticsQuery,
  UptimeStats,
  HealthCheckResult,
} from '@/lib/types/api';

export const analyticsKeys = {
  all: ['analytics'] as const,
  uptime: () => [...analyticsKeys.all, 'uptime'] as const,
  uptimeStats: (query: AnalyticsQuery) =>
    [...analyticsKeys.uptime(), query] as const,
  healthChecks: () => [...analyticsKeys.all, 'health-checks'] as const,
};

export const useUptimeStats = (query: AnalyticsQuery) => {
  return useQuery({
    queryKey: analyticsKeys.uptimeStats(query),
    queryFn: () => apiClient.getUptimeStats(query),
    enabled: !!query.product_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useTriggerHealthCheck = () => {
  return useMutation({
    mutationFn: (productId: number) => apiClient.triggerHealthCheck(productId),
  });
};

export const useUptimeStats24h = (productId: number) => {
  return useQuery({
    queryKey: analyticsKeys.uptimeStats({
      product_id: productId,
      period: '24h',
    }),
    queryFn: () =>
      apiClient.getUptimeStats({ product_id: productId, period: '24h' }),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useUptimeStats7d = (productId: number) => {
  return useQuery({
    queryKey: analyticsKeys.uptimeStats({
      product_id: productId,
      period: '7d',
    }),
    queryFn: () =>
      apiClient.getUptimeStats({ product_id: productId, period: '7d' }),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

export const useUptimeStats30d = (productId: number) => {
  return useQuery({
    queryKey: analyticsKeys.uptimeStats({
      product_id: productId,
      period: '30d',
    }),
    queryFn: () =>
      apiClient.getUptimeStats({ product_id: productId, period: '30d' }),
    enabled: !!productId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
};

export const useUptimeStats90d = (productId: number) => {
  return useQuery({
    queryKey: analyticsKeys.uptimeStats({
      product_id: productId,
      period: '90d',
    }),
    queryFn: () =>
      apiClient.getUptimeStats({ product_id: productId, period: '90d' }),
    enabled: !!productId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  });
};

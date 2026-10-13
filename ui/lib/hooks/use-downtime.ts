import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DowntimeQuery } from '@/lib/types/api';

export const downtimeKeys = {
  all: ['downtime'] as const,
  lists: () => [...downtimeKeys.all, 'list'] as const,
  list: (query: DowntimeQuery) => [...downtimeKeys.lists(), query] as const,
};

export const useDowntime = (query: DowntimeQuery) => {
  return useQuery({
    queryKey: downtimeKeys.list(query),
    queryFn: ({ signal }) => apiClient.getDowntime(query, signal),
    enabled: !!query.product_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useRecentDowntime = (productId: number, days: number = 30) => {
  return useQuery({
    queryKey: [...downtimeKeys.lists(), { productId, days }],
    queryFn: ({ signal }) => {
      const now = new Date();
      return apiClient.getDowntime({
        product_id: productId,
        start_date: new Date(now.getTime() - days * 86400000).toISOString(),
        end_date: now.toISOString(),
      }, signal);
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

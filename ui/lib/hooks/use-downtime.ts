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
    queryFn: () => apiClient.getDowntime(query),
    enabled: !!query.product_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useRecentDowntime = (productId: number, days: number = 30) => {
  const now = new Date();
  now.setSeconds(0, 0); // Reset seconds and milliseconds
  const endDate = now.toISOString();
  const startDate = new Date(
    now.getTime() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  return useQuery({
    queryKey: [
      ...downtimeKeys.lists(),
      { productId, days, startDate: startDate.slice(0, 16) },
    ], // Only use date/hour/minute
    queryFn: () =>
      apiClient.getDowntime({
        product_id: productId,
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

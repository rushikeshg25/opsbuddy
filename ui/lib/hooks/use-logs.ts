import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { LogsQuery, LogsResponse } from '@/lib/types/api';

export const logKeys = {
  all: ['logs'] as const,
  lists: () => [...logKeys.all, 'list'] as const,
  list: (query: LogsQuery) => [...logKeys.lists(), query] as const,
};

export const useLogsRealtime = (
  query: LogsQuery,
  refreshInterval: number = 30000
) => {
  return useQuery({
    queryKey: logKeys.list(query),
    queryFn: () => apiClient.getLogs(query),
    enabled: !!query.product_id,
    refetchInterval: refreshInterval,
    staleTime: 0, // Always consider stale for real-time updates
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};

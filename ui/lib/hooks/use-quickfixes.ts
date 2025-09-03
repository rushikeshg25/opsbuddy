import { useQuery } from '@tanstack/react-query';
import { QuickFixesQuery } from '../types/api';
import apiClient from '../api-client';

export const quickFixesKeys = {
  all: ['quickfixes'] as const,
  lists: () => [...quickFixesKeys.all, 'list'] as const,
  list: (query: QuickFixesQuery) => [...quickFixesKeys.lists(), query] as const,
};

export const useQuickFixes = (query: QuickFixesQuery) => {
  return useQuery({
    queryKey: quickFixesKeys.list(query),
    queryFn: () => apiClient.getQuickFixes(query),
    enabled: !!query.product_id,
  });
};

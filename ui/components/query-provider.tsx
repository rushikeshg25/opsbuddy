"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a function to make a new query client
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (error?.status >= 400 && error?.status < 500) {
            if (error.status === 408 || error.status === 429) {
              return failureCount < 2;
            }
            return false;
          }
          // Retry on network errors and 5xx errors
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // Don't retry mutations on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
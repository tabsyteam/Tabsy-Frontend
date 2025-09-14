'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, ToastProvider } from '@tabsy/ui-components';
import { TabsyAPI } from '@tabsy/api-client';
import { ThemeProvider } from './ThemeProvider';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // With SSR, we usually want to set some default staleTime
      // above 0 to avoid refetching immediately on the client
      staleTime: 60 * 1000,
    },
  },
});

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps): JSX.Element {
  const [apiClient] = useState(() => new TabsyAPI({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1'
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider apiClient={apiClient}>
        <ThemeProvider variant="admin">
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
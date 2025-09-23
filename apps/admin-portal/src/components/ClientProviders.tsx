'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, ToastProvider, ConnectionProvider } from '@tabsy/ui-components';
import { TabsyAPI, tabsyClient } from '@tabsy/api-client';
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
  // Use the shared tabsyClient instance for consistency across all apps
  const apiClient = tabsyClient;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider apiClient={apiClient}>
        <ConnectionProvider apiClient={apiClient}>
          <ThemeProvider variant="admin">
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </ConnectionProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
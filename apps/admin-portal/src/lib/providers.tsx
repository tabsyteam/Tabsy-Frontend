"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { AuthProvider, ToastProvider } from '@tabsy/ui-components';
import { TabsyAPI } from '@tabsy/api-client';

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  }));

  const [apiClient] = useState(() => new TabsyAPI({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1'
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider apiClient={apiClient}>
        <ToastProvider>
          {children}
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

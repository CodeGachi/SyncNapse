/**
 * React Query 클라이언트 프로바이더
 * QueryClient 설정 및 인증 인터셉터 초기화
 */

"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupAuthInterceptor } from "@/lib/api/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // Fresh for 5 minutes
            gcTime: 1000 * 60 * 10, // Cache retention for 10 minutes (formerly cacheTime)
            retry: 2, // Retry 2 times on failure
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
            refetchOnWindowFocus: true, // Revalidate on window focus
            refetchOnReconnect: true, // Revalidate on network reconnect
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
        // Consider applying QueryCache / MutationCache
      })
  );

  // 앱 시작 시 인증 인터셉터 초기화
  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

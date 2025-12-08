/**
 * React Query 클라이언트 프로바이더
 * QueryClient 설정 및 인증 인터셉터 초기화
 */

"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupAuthInterceptor } from "@/lib/api/client";
import { CACHE_CONFIG, API_CONFIG } from "@/lib/constants/config";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CACHE_CONFIG.QUERY_STALE_TIME_MS,
            gcTime: CACHE_CONFIG.QUERY_GC_TIME_MS,
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(API_CONFIG.RETRY_DELAY_MS * 2 ** attemptIndex, API_CONFIG.TIMEOUT_MS),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
            retryDelay: API_CONFIG.RETRY_DELAY_MS,
          },
        },
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

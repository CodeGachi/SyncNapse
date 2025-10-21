/**
 * 인증 상태 관리 훅
 * TanStack Query 기반으로 마이그레이션
 */

"use client";

import { useCurrentUser } from "@/lib/api/queries/auth.queries";

export function useAuth() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();

  return {
    user: user || null,
    loading: isLoading,
    isAuthenticated: !!user && !isError,
    refetch, // 수동 갱신 함수
  };
}

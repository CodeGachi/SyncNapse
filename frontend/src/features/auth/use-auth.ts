/**
 * Authentication state management hook
 */

"use client";

import { useCurrentUser } from "@/lib/api/queries/auth.queries";

export function useAuth() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();

  return {
    user: user || null,
    loading: isLoading,
    isAuthenticated: !!user && !isError,
    refetch, // Manual update function
  };
}

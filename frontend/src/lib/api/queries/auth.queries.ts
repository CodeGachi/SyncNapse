/**
 * 인증 관련 TanStack Query 쿼리
 *
 * 사용자 정보 조회를 위한 useQuery 훅
 */
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCurrentUser, type User } from "../services/auth.api";
import { mockGetCurrentUser } from "@/lib/mock/auth.mock";
import { getValidAccessToken } from "@/lib/auth/token-manager";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

/**
 * 현재 사용자 정보 조회 쿼리
 *
 * @example
 * const { data: user, isLoading } = useCurrentUser();
 */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: async () => {
      // Use getValidAccessToken to trigger refresh if needed
      const token = await getValidAccessToken();
      if (!token) {
        return null;
      }

      try {
        if (USE_MOCK) {
          return await mockGetCurrentUser();
        }
        return await getCurrentUser();
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: false,
    ...options,
  });
}


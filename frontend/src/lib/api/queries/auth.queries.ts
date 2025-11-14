import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCurrentUser, verifyToken, type User } from "../auth.api";
import { mockGetCurrentUser } from "@/lib/mock/auth.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

/**
 * Get current user info
 */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: async () => {
      console.log('[useCurrentUser] Fetching current user...');
      const token = localStorage.getItem("authToken");
      console.log('[useCurrentUser] Token exists:', !!token);
      console.log('[useCurrentUser] USE_MOCK:', USE_MOCK);

      if (!token) {
        console.log('[useCurrentUser] No token found, returning null');
        return null;
      }

      try {
        if (USE_MOCK) {
          console.log('[useCurrentUser] Using mock auth');
          const user = await mockGetCurrentUser();
          console.log('[useCurrentUser] Mock user:', user);
          return user;
        }
        console.log('[useCurrentUser] Using real auth');
        return await getCurrentUser();
      } catch (error) {
        console.error('[useCurrentUser] Error:', error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: false,
    ...options,
  });
}

/**
 * Token verification
 */
export function useVerifyToken(token: string | null) {
  return useQuery({
    queryKey: ["auth", "verify", token],
    queryFn: () => {
      if (!token) throw new Error("No token");
      return verifyToken(token);
    },
    enabled: !!token,
    retry: false,
  });
}

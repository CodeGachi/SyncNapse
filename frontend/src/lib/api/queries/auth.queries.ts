import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCurrentUser, type User } from "../auth.api";

/**
 * Get current user info from JWT token
 * Decodes the token stored in localStorage
 */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: async () => {
      try {
        return await getCurrentUser();
      } catch (error) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    retry: false,
    ...options,
  });
}

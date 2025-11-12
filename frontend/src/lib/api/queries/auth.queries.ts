import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCurrentUser, verifyToken, type User } from "../auth.api";

/**
 * Get current user info
 */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return null;

      try {
        return await getCurrentUser();
      } catch (error) {
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

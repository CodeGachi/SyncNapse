import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCurrentUser, type User } from "../services/auth.api";
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
      const token = localStorage.getItem("authToken");
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


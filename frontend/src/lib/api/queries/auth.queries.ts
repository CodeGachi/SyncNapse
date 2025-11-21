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
      console.log('[useCurrentUser] Fetching current user...');
      const authToken = localStorage.getItem("authToken");
      const syncnapseToken = localStorage.getItem("syncnapse_access_token");
      console.log('[useCurrentUser] authToken exists:', !!authToken);
      console.log('[useCurrentUser] syncnapse_access_token exists:', !!syncnapseToken);
      console.log('[useCurrentUser] USE_MOCK:', USE_MOCK);

      // Sync tokens if one exists but not the other
      if (authToken && !syncnapseToken) {
        console.log('[useCurrentUser] Syncing authToken to syncnapse_access_token');
        localStorage.setItem("syncnapse_access_token", authToken);
      } else if (syncnapseToken && !authToken) {
        console.log('[useCurrentUser] Syncing syncnapse_access_token to authToken');
        localStorage.setItem("authToken", syncnapseToken);
      }

      // Check if we have any token
      const hasToken = authToken || syncnapseToken;
      if (!hasToken) {
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
        const user = await getCurrentUser();
        console.log('[useCurrentUser] Real user:', user);
        return user;
      } catch (error) {
        console.error('[useCurrentUser] Error:', error);
        // Don't remove tokens on error - might be temporary network issue
        // Only return null to show login page
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: false,
    ...options,
  });
}


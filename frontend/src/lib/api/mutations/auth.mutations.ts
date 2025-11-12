import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { exchangeCodeForToken, logout as logoutApi, getCurrentUser, type OAuthTokenResponse } from "../auth.api";

export function useLogin(
  options?: UseMutationOptions<
    OAuthTokenResponse,
    Error,
    { code: string; state: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
      localStorage.setItem("syncnapse_access_token", accessToken);
      localStorage.setItem("syncnapse_refresh_token", refreshToken);

      try {
        const parts = accessToken.split(".");
        const decoded = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        return {
          accessToken,
          refreshToken,
          user: {
            id: decoded.sub || decoded.id,
            email: decoded.email || "",
            name: decoded.name || "User",
          },
        };
      } catch {
        return { accessToken, refreshToken, user: {} };
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "currentUser"], data.user);
    },
    ...options,
  });
}

export function useLogout(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logoutApi();
    },
    onSuccess: () => {
      // Clear tokens from localStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      
      // Clear cookies
      document.cookie = "authToken=; path=/; max-age=0";
      document.cookie = "refreshToken=; path=/; max-age=0";
      
      // Clear React Query cache
      queryClient.clear();
    },
    ...options,
  });
}

/**
 * 인증 관련 React Query 뮤테이션 훅
 * 로그인, 로그아웃 등 인증 작업 처리
 */

import { createLogger } from "@/lib/utils/logger";
import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { exchangeCodeForToken, logout as logoutApi, type OAuthTokenResponse } from "../auth.api";
import { getCurrentUser } from "../services/auth.api";
import { setAccessToken, setRefreshToken, clearTokens } from "@/lib/auth/token-manager";

const log = createLogger("AuthMutation");

export function useLogin(
  options?: UseMutationOptions<
    OAuthTokenResponse,
    Error,
    { code: string; state: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const response = await exchangeCodeForToken(code, state);
      return response;
    },
    onSuccess: async (data) => {
      // Store tokens in cookies
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      // Fetch user info
      try {
        const user = await getCurrentUser();
        queryClient.setQueryData(["auth", "currentUser"], user);
      } catch (error) {
        log.error("Failed to fetch user info:", error);
      }
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
      // Clear tokens from cookies
      clearTokens();

      // Clear React Query cache
      queryClient.clear();
    },
    ...options,
  });
}

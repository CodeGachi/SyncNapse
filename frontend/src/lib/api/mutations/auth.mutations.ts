import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { logout as logoutApi } from "../auth.api";

export function useLogin(
  options?: UseMutationOptions<
    { accessToken: string; refreshToken: string; user: any },
    Error,
    { accessToken: string; refreshToken: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
      // 백엔드에서 이미 토큰을 받았으므로, 로컬에 저장하기만 함
      localStorage.setItem("authToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // JWT 토큰에서 사용자 정보 추출
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
      // 사용자 정보를 캐시에 저장
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
      
      queryClient.clear();
    },
    ...options,
  });
}

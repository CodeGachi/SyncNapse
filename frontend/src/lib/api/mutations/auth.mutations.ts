import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { exchangeCodeForToken, logout as logoutApi } from "../auth.api";

/**
 * 로그인 (코드 교환)
 */
export function useLogin(
  options?: UseMutationOptions<
    { token: string; user: any },
    Error,
    { code: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const response = await exchangeCodeForToken(code);
      return response;
    },
    onSuccess: (data) => {
      // 토큰 저장
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // 쿠키에도 저장 (서버사이드 인증용)
      document.cookie = `authToken=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;

      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["auth", "currentUser"], data.user);
    },
    ...options,
  });
}

/**
 * 로그아웃
 */
export function useLogout(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logoutApi();
    },
    onSuccess: () => {
      // 로컬 스토리지 및 쿠키 삭제
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      document.cookie = "authToken=; path=/; max-age=0";

      // 모든 쿼리 캐시 초기화
      queryClient.clear();

      // 또는 특정 쿼리만 무효화
      // queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    ...options,
  });
}

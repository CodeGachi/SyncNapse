/**
 * Google OAuth 로그인 훅
 * 로그인, 로그아웃, OAuth 코드 교환 기능 제공
 */
"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLogin, useLogout } from "@/lib/api/mutations/auth.mutations";
import { getGoogleLoginUrl } from "@/lib/api/services/auth.api";
import { mockGoogleLogin, mockLogout } from "@/lib/mock/auth.mock";
import { createLogger } from "@/lib/utils/logger";
import { clearTokens } from "@/lib/auth/token-manager";
import { getCookie, setCookie, deleteCookie } from "@/lib/utils/cookie";

const log = createLogger("GoogleLogin");
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function useGoogleLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useLogin({
    onSuccess: () => {
      // 저장된 리다이렉트 URL 확인
      const redirectUrl = getCookie("redirectAfterLogin") || "/dashboard/main";
      deleteCookie("redirectAfterLogin");
      log.debug("로그인 성공, 리다이렉트:", redirectUrl);
      router.push(redirectUrl);
    },
    onError: () => {
      alert("로그인에 실패했습니다.");
    },
  });

  const logoutMutation = useLogout({
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });

  const handleGoogleLogin = async () => {
    try {
      if (USE_MOCK) {
        await mockGoogleLogin();
        // 저장된 리다이렉트 URL 확인
        const redirectUrl = getCookie("redirectAfterLogin") || "/dashboard/main";
        deleteCookie("redirectAfterLogin");
        window.location.href = redirectUrl;
      } else {
        // 로그인 후 돌아올 현재 URL 저장 (쿼리 파라미터 포함)
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== "/" && currentPath !== "/login" && !currentPath.startsWith("/auth")) {
          setCookie("redirectAfterLogin", currentPath, 60 * 60); // 1시간
          log.debug("리다이렉트 URL 저장:", currentPath);
        }

        // 백엔드 Google OAuth URL로 리다이렉트
        const loginUrl = getGoogleLoginUrl();
        window.location.href = loginUrl;
      }
    } catch (err: any) {
      alert(err.message || "로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // OAuth 콜백 페이지에서 인증 코드 교환
  const handleCodeExchange = (code: string, state: string) => {
    loginMutation.mutate({ code, state });
  };

  const handleLogout = async () => {
    try {
      // 중요: API 호출이나 네비게이션 전에 토큰을 먼저 삭제
      log.debug("토큰 정리 중...");
      clearTokens();
      deleteCookie("redirectAfterLogin");

      log.debug("토큰 정리 완료, 로그아웃 진행...");

      if (USE_MOCK) {
        await mockLogout();
        queryClient.clear();
        router.replace("/login");
      } else {
        // 로그아웃 API 호출 (백엔드에서 토큰 무효화)
        logoutMutation.mutate();
      }
    } catch (err: any) {
      alert(err.message || "로그아웃에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return {
    handleGoogleLogin,
    handleCodeExchange,
    handleLogout,
    loading: loginMutation.isPending || logoutMutation.isPending,
    error: loginMutation.error?.message || logoutMutation.error?.message || null,
  };
}

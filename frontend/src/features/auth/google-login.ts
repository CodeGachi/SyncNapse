/**
 * SyncNapse Google OAuth 로그인 기능 훅
 * TanStack Query 기반으로 마이그레이션
 */

"use client";

import { useRouter } from "next/navigation";
import { useGoogleLogin as useGoogleLoginMutation, useLogout } from "@/lib/api/mutations/auth.mutations";
import { getGoogleLoginUrl } from "@/lib/api/auth.api";
import { mockGoogleLogin, mockLogout } from "@/lib/mock/auth.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function useGoogleLogin() {
  const router = useRouter();

  const loginMutation = useGoogleLoginMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (error) => {
      console.error("로그인 실패:", error);
      alert("로그인에 실패했습니다.");
    },
  });

  const logoutMutation = useLogout({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  /**
   * Google 로그인 시작
   */
  const handleGoogleLogin = async () => {
    try {
      if (USE_MOCK) {
        // ===== Mock 모드 (개발용) =====
        console.log("[Mock] Google 로그인 시작...");
        const { user, token } = await mockGoogleLogin();

        console.log("[Mock] 로그인 성공:", {
          email: user.email,
          name: user.name,
        });

        // 대시보드로 리다이렉트
        window.location.href = "/dashboard";
      } else {
        // ===== Real 모드 (백엔드 연동) =====
        console.log("[Real] Google OAuth 시작...");

        // 현재 페이지 URL 저장 (로그인 후 돌아오기 위함)
        sessionStorage.setItem("auth_redirect", window.location.pathname);

        // 백엔드 Google OAuth URL로 리다이렉트
        const loginUrl = getGoogleLoginUrl();
        console.log("[Real] 리다이렉트:", loginUrl);

        window.location.href = loginUrl;
      }
    } catch (err: any) {
      console.error("로그인 실패:", err);
      alert(err.message || "로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  /**
   * 인증 코드 교환 (OAuth 콜백 페이지에서 사용)
   */
  const handleCodeExchange = (code: string) => {
    loginMutation.mutate({ code });
  };

  /**
   * 로그아웃
   */
  const handleLogout = async () => {
    try {
      if (USE_MOCK) {
        await mockLogout();
        console.log("[Mock] 로그아웃 완료");
        window.location.href = "/";
      } else {
        logoutMutation.mutate();
      }
    } catch (err: any) {
      console.error("로그아웃 실패:", err);
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

"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLogin, useLogout } from "@/lib/api/mutations/auth.mutations";
import { getGoogleLoginUrl } from "@/lib/api/services/auth.api";
import { mockGoogleLogin, mockLogout } from "@/lib/mock/auth.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function useGoogleLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useLogin({
    onSuccess: () => {
      // Check if there's a saved redirect URL
      const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
      localStorage.removeItem("redirectAfterLogin");
      console.log("[GoogleLogin] ✅ Login successful, redirecting to:", redirectUrl);
      router.push(redirectUrl);
    },
    onError: (error) => {
      alert("로그인에 실패했습니다.");
    },
  });

  const logoutMutation = useLogout({
    onSuccess: () => {
      queryClient.clear();
      router.replace("/");
    },
  });

  const handleGoogleLogin = async () => {
    try {
      if (USE_MOCK) {
        const { user, token } = await mockGoogleLogin();

        // React Query 캐시에 사용자 정보 업데이트
        queryClient.setQueryData(["auth", "currentUser"], user);

        console.log("[Auth] Mock 로그인 완료:", user);

        // Check if there's a saved redirect URL
        const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
        localStorage.removeItem("redirectAfterLogin");

        // 대시보드로 리다이렉트
        router.push(redirectUrl);
      } else {
        // Save current URL (with query params) to redirect back after login
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== "/" && !currentPath.startsWith("/auth")) {
          localStorage.setItem("redirectAfterLogin", currentPath);
          console.log("[GoogleLogin] 💾 Saved redirect URL:", currentPath);
        }

        // 백엔드 Google OAuth로 리다이렉트
        const loginUrl = getGoogleLoginUrl();
        window.location.href = loginUrl;
      }
    } catch (err: any) {
      console.error("[Auth] 로그인 실패:", err);
      alert(err.message || "로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  /**
   * Handle OAuth callback with tokens from backend
   * Called from /auth/callback page after OAuth completes
   */
  const handleOAuthCallback = (accessToken: string, refreshToken: string) => {
    loginMutation.mutate({ accessToken, refreshToken });
  };

  const handleLogout = async () => {
    try {
      // IMPORTANT: Clear tokens FIRST before any API call or navigation
      // This prevents race condition where page reload happens before token cleanup
      console.log("[GoogleLogin] 🧹 Clearing tokens from localStorage...");
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("redirectAfterLogin");
      
      // Clear cookies
      document.cookie = "authToken=; path=/; max-age=0";
      document.cookie = "refreshToken=; path=/; max-age=0";
      
      console.log("[GoogleLogin] ✅ Tokens cleared, now logging out...");

      if (USE_MOCK) {
        await mockLogout();

        // React Query 캐시 초기화
        queryClient.clear();

        console.log("[Auth] Mock 로그아웃 완료");

        // 홈으로 리다이렉트
        router.replace("/");
      } else {
        // Call logout API (this will invalidate tokens on backend)
        logoutMutation.mutate();
      }
    } catch (err: any) {
      console.error("[Auth] 로그아웃 실패:", err);
      alert(err.message || "로그아웃에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return {
    handleGoogleLogin,
    handleOAuthCallback,
    handleLogout,
    loading: loginMutation.isPending || logoutMutation.isPending,
    error: loginMutation.error?.message || logoutMutation.error?.message || null,
  };
}

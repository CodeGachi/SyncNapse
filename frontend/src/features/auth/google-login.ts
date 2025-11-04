/**
 * Google OAuth Login Hook
 */

"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLogin, useLogout } from "@/lib/api/mutations/auth.mutations";
import { getGoogleLoginUrl } from "@/lib/api/auth.api";
import { mockGoogleLogin, mockLogout } from "@/lib/mock/auth.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function useGoogleLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useLogin({
    onSuccess: () => {
      router.push("/dashboard/main");
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
        window.location.href = "/dashboard/main";
      } else {
        // 백엔드 Google OAuth로 리다이렉트
        const loginUrl = getGoogleLoginUrl();
        window.location.href = loginUrl;
      }
    } catch (err: any) {
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
      if (USE_MOCK) {
        await mockLogout();
        queryClient.clear();
        router.replace("/");
      } else {
        logoutMutation.mutate();
      }
    } catch (err: any) {
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

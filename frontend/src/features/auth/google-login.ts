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
      router.push("/dashboard");
    },
    onError: (error) => {
      console.error("로그인 실패:", error);
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
        console.log("[Mock] Google 로그인 시작...");
        const { user, token } = await mockGoogleLogin();

        console.log("[Mock] 로그인 성공:", {
          email: user.email,
          name: user.name,
        });

        window.location.href = "/dashboard";
      } else {
        console.log("[Real] Google OAuth 시작...");

        sessionStorage.setItem("auth_redirect", window.location.pathname);

        // Redirect to the backend Google OAuth URL
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
   * Authorization code exchange (used in the OAuth callback page)
   */
  const handleCodeExchange = (code: string) => {
    loginMutation.mutate({ code });
  };

  const handleLogout = async () => {
    try {
      if (USE_MOCK) {
        await mockLogout();
        console.log("[Mock] 로그아웃 완료");

        queryClient.clear();

        router.replace("/");
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

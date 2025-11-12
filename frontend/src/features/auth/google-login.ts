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
        // Check if there's a saved redirect URL
        const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirectUrl;
      } else {
        // Save current URL (with query params) to redirect back after login
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== "/" && !currentPath.startsWith("/auth")) {
          localStorage.setItem("redirectAfterLogin", currentPath);
          console.log("[GoogleLogin] 💾 Saved redirect URL:", currentPath);
        }

        // Redirect to the backend Google OAuth URL
        const loginUrl = getGoogleLoginUrl();
        window.location.href = loginUrl;
      }
    } catch (err: any) {
      alert(err.message || "로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // Authorization code exchange (used in the OAuth callback page)
  const handleCodeExchange = (code: string, state: string) => {
    loginMutation.mutate({ code, state });
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
        queryClient.clear();
        router.replace("/");
      } else {
        // Call logout API (this will invalidate tokens on backend)
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

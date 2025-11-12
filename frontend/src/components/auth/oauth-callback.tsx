"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/auth.api";
import { AuthLoading } from "./auth-loading";

export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
<<<<<<< HEAD
  const { handleOAuthCallback, loading, error } = useGoogleLogin();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const errorParam = searchParams.get("error");

    // 에러 확인
    if (errorParam) {
      alert(`로그인에 실패했습니다: ${decodeURIComponent(errorParam)}`);
      router.replace("/");
      return;
    }

    // 토큰 확인
    if (accessToken && refreshToken) {
      handleOAuthCallback(accessToken, refreshToken);
    } else if (!accessToken && !refreshToken && !errorParam) {
      // 토큰도 에러도 없으면 리다이렉트 (백엔드가 쿠키에 저장한 경우)
      setTimeout(() => {
        const token = localStorage.getItem("syncnapse_access_token");
        if (token) {
          router.push("/dashboard/main");
        } else {
          router.replace("/");
        }
      }, 1000);
    } else {
      router.replace("/");
    }
  }, [searchParams, handleOAuthCallback, router]);
=======
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        alert("로그인에 실패했습니다.");
        router.replace("/");
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // Store tokens in localStorage
          localStorage.setItem("authToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          
          // Store token in cookie for SSR
          document.cookie = `authToken=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
          document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`;
          
          // Fetch user info and update React Query cache
          const user = await getCurrentUser();
          queryClient.setQueryData(["auth", "currentUser"], user);
          
          // Redirect to original page or dashboard
          const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
          localStorage.removeItem("redirectAfterLogin"); // Clean up
          
          console.log("[OAuthCallback] ✅ Login successful, redirecting to:", redirectUrl);
          router.replace(redirectUrl);
        } catch (error) {
          console.error("Failed to fetch user info:", error);
          alert("사용자 정보를 가져오는데 실패했습니다.");
          router.replace("/");
        }
      } else {
        router.replace("/");
      }
      
      setIsProcessing(false);
    };
>>>>>>> dev

    processCallback();
  }, [searchParams, router, queryClient]);

  return <AuthLoading />;
}

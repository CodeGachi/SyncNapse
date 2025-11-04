/**
 * OAuth Callback Component
 * Handles OAuth callback logic and token exchange
 */

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleLogin } from "@/features/auth/google-login";
import { AuthLoading } from "./auth-loading";
import { AuthError } from "./auth-error";

export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        const token = localStorage.getItem("authToken");
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

  if (error) {
    return <AuthError error={error} />;
  }

  return <AuthLoading />;
}

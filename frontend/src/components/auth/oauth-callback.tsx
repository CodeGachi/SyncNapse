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
  const { handleCodeExchange, loading, error } = useGoogleLogin();

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      alert("로그인에 실패했습니다.");
      router.replace("/");
      return;
    }

    if (code) {
      handleCodeExchange(code);
    } else {
      router.replace("/");
    }
  }, [searchParams, handleCodeExchange, router]);

  if (error) {
    return <AuthError error={error} />;
  }

  return <AuthLoading />;
}

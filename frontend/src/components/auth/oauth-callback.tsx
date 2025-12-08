/**
 * OAuth 콜백 컴포넌트
 * OAuth 인증 후 토큰 저장 및 리다이렉트 처리
 * UI 컴포넌트 - 비즈니스 로직은 useOAuthCallback 훅에서 처리
 */
"use client";

import { AuthLoading } from "./auth-loading";
import { useOAuthCallback } from "@/features/auth/use-oauth-callback";

export function OAuthCallback() {
  useOAuthCallback();

  return <AuthLoading />;
}

/**
 * SyncNapse Authentication API
 * Authentication-related API functions that communicate with the backend
 */

import { apiClient, getAuthHeaders } from "./client";

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

/**
 * Google OAuth 로그인 시작
 * 백엔드 Google OAuth 엔드포인트로 리다이렉트하기 위한 URL 반환
 */
export function getGoogleLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${baseUrl}/api/auth/google/login`;
}

/**
 * OAuth 콜백 후 토큰 교환
 * 백엔드에서 받은 인증 코드를 JWT 토큰으로 교환
 */
export async function exchangeCodeForToken(code: string): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/api/auth/google/callback", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/**
 * 토큰 검증
 * URL에 포함된 token을 검증하고 사용자 정보 반환
 */
export async function verifyToken(token: string): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * 현재 로그인된 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient<User>("/api/auth/me", {
    headers: getAuthHeaders(),
  });
}

/**
 * 로그아웃
 */
export async function logout(): Promise<void> {
  return apiClient<void>("/api/auth/logout", {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

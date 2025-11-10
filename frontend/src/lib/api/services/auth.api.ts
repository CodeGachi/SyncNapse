/**
 * Authentication API V2 - HTTP Client 통합
 * 새로운 구조:
 * - apiClient 사용 (interceptor, retry, timeout, caching 등)
 * - Request interceptor로 Authorization 헤더 자동 주입
 * - 동기화 큐 미필요 (상태성 없는 인증)
 */

import { apiClient } from "../client";

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
 * Start Google OAuth login
 * Redirects to the backend Google OAuth endpoint
 */
export function getGoogleLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${baseUrl}/api/auth/google`;
}

/**
 * Check authentication status
 * - HTTP Client V2 사용 (timeout, retry, cache 등)
 * - Request interceptor에서 Authorization 헤더 자동 주입
 */
export async function checkAuthStatus(): Promise<{ ok: boolean }> {
  return apiClient<{ ok: boolean }>("/api/auth/check", {
    method: "GET",
  });
}

/**
 * Get current user info from JWT token
 * Decodes the JWT token stored in localStorage
 * Mock 모드일 때는 localStorage의 user 직접 반환
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("syncnapse_access_token");
  if (!token) return null;

  try {
    // Mock 토큰인 경우 (JWT 형식이 아님)
    if (token.startsWith("mock-jwt-token-")) {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;

      const user = JSON.parse(userStr);

      // 구버전 데이터 마이그레이션: via.placeholder.com URL 제거
      if (user.picture?.includes("via.placeholder.com")) {
        user.picture = undefined;
        localStorage.setItem("user", JSON.stringify(user));
      }

      return user;
    }

    // JWT 토큰 디코드 (간단한 방식: payload 부분만 추출)
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");

    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    // 토큰 만료 확인
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("syncnapse_access_token");
      return null;
    }

    // 사용자 정보 반환 (토큰에 포함된 정보)
    return {
      id: decoded.sub || decoded.id,
      email: decoded.email || "",
      name: decoded.name || "User",
      picture: decoded.picture,
      createdAt: decoded.iat
        ? new Date(decoded.iat * 1000).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Auth] getCurrentUser 실패:", error);
    localStorage.removeItem("syncnapse_access_token");
    return null;
  }
}

/**
 * Logout
 * - HTTP Client V2 사용
 * - 항상 로컬 토큰 제거
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("syncnapse_refresh_token");

  try {
    await apiClient<{ message: string }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    // 항상 로컬 토큰 제거
    localStorage.removeItem("syncnapse_access_token");
    localStorage.removeItem("syncnapse_refresh_token");
  }
}

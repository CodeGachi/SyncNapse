/**
 * 인증 API 서비스
 * 인증 관련 API 호출 처리
 */

import { createLogger } from "@/lib/utils/logger";
import { apiClient } from "../client";
import { getValidAccessToken, clearTokens } from "@/lib/auth/token-manager";

const log = createLogger("Auth");

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
 * 백엔드 Google OAuth 엔드포인트로 리다이렉트
 */
export function getGoogleLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url = `${baseUrl}/api/auth/google`;
  log.info("Google OAuth URL:", url, "API_URL:", baseUrl);
  return url;
}

/**
 * 인증 상태 확인
 */
export async function checkAuthStatus(): Promise<{ ok: boolean }> {
  return apiClient<{ ok: boolean }>("/api/auth/check", {
    method: "GET",
  });
}

/**
 * 백엔드에서 현재 사용자 정보 가져오기
 * 백엔드 API에서 사용자 정보 조회
 */
export async function getCurrentUserFromAPI(): Promise<User> {
  log.debug("Calling GET /api/users/me...");
  const response = await apiClient<{
    id: string;
    email: string;
    name?: string;
    displayName?: string;
    picture?: string | null;
    createdAt: string;
  }>("/api/users/me", {
    method: "GET",
  });

  log.debug("GET /api/users/me response:", response);

  // Backend returns { displayName, email, ... } but we need to map it
  return {
    id: response.id,
    email: response.email,
    name: response.displayName || response.name || "User",
    picture: response.picture || undefined,
    createdAt: response.createdAt,
  };
}

/**
 * 사용자 프로필 업데이트
 * 백엔드 API를 통해 사용자 정보 업데이트
 */
export interface UpdateUserDto {
  displayName?: string;
}

export async function updateUserProfile(data: UpdateUserDto): Promise<User> {
  log.debug("Calling PATCH /api/users/me with:", data);
  const response = await apiClient<{
    id: string;
    email: string;
    displayName?: string;
    name?: string;
    picture?: string | null;
    createdAt: string;
  }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  log.debug("PATCH /api/users/me response:", response);

  return {
    id: response.id,
    email: response.email,
    name: response.displayName || response.name || "User",
    picture: response.picture || undefined,
    createdAt: response.createdAt,
  };
}

/**
 * 백엔드 API에서 현재 사용자 정보 가져오기
 * token-manager를 통해 토큰 유효성을 검증하고 필요시 자동 갱신
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // token-manager를 통해 유효한 토큰 가져오기 (자동 갱신 포함)
    const token = await getValidAccessToken();

    if (!token) {
      log.debug("No valid token available");
      localStorage.removeItem("user");
      return null;
    }

    // 백엔드 API에서 최신 사용자 정보 가져오기
    try {
      const user = await getCurrentUserFromAPI();
      log.debug("Fetched user from API:", user);
      return user;
    } catch (apiError) {
      log.warn("API call failed, falling back to token data:", apiError);

      // API 호출 실패 시 토큰 데이터로 폴백
      const parts = token.split(".");
      if (parts.length !== 3) {
        clearTokens();
        return null;
      }

      const decoded = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      return {
        id: decoded.sub || decoded.id,
        email: decoded.email || "",
        name: decoded.name || "User",
        picture: decoded.picture,
        createdAt: decoded.iat
          ? new Date(decoded.iat * 1000).toISOString()
          : new Date().toISOString(),
      };
    }
  } catch (error) {
    log.error("getCurrentUser 실패:", error);
    clearTokens();
    return null;
  }
}

/**
 * localStorage에서 모든 인증 토큰 제거
 */
function clearAuthTokens(): void {
  clearTokens();
  localStorage.removeItem("user");
}

/**
 * 로그아웃
 * - HTTP Client V2 사용
 * - 항상 로컬 토큰 제거
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    await apiClient<{ message: string }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    clearAuthTokens();
  }
}

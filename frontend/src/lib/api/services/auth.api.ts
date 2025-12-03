/**
 * Authentication API
 * Handles authentication-related API calls
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url = `${baseUrl}/api/auth/google`;
  console.log("[Auth] Google OAuth URL:", url, "API_URL:", baseUrl);
  return url;
}

/**
 * Check authentication status
 */
export async function checkAuthStatus(): Promise<{ ok: boolean }> {
  return apiClient<{ ok: boolean }>("/api/auth/check", {
    method: "GET",
  });
}

/**
 * Get current user info from backend
 * Fetches user information from the backend API
 */
export async function getCurrentUserFromAPI(): Promise<User> {
  console.log("[Auth] Calling GET /api/users/me...");
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

  console.log("[Auth] GET /api/users/me response:", response);

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
 * Update user profile
 * Updates user information via backend API
 */
export interface UpdateUserDto {
  displayName?: string;
}

export async function updateUserProfile(data: UpdateUserDto): Promise<User> {
  console.log("[Auth] Calling PATCH /api/users/me with:", data);
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

  console.log("[Auth] PATCH /api/users/me response:", response);

  return {
    id: response.id,
    email: response.email,
    name: response.displayName || response.name || "User",
    picture: response.picture || undefined,
    createdAt: response.createdAt,
  };
}

/**
 * Get current user info from backend API
 * First validates token, then fetches fresh user data from API
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("authToken");
  if (!token) {
    localStorage.removeItem("user");
    return null;
  }

  try {
    // JWT 토큰 형식 검증 (3 parts: header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.warn("[Auth] Invalid JWT token format, removing...");
      clearAuthTokens();
      return null;
    }

    // JWT 토큰 디코드 (만료 확인용)
    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    // 필수 필드 확인
    if (!decoded || (!decoded.sub && !decoded.id)) {
      console.warn("[Auth] Token missing user ID, removing...");
      clearAuthTokens();
      return null;
    }

    // 토큰 만료 확인
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn("[Auth] Token expired, removing...");
      clearAuthTokens();
      return null;
    }

    // 백엔드 API에서 최신 사용자 정보 가져오기
    try {
      const user = await getCurrentUserFromAPI();
      console.log("[Auth] Fetched user from API:", user);
      return user;
    } catch (apiError) {
      console.warn("[Auth] API call failed, falling back to token data:", apiError);
      // API 호출 실패 시 토큰 데이터로 폴백
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
    console.error("[Auth] getCurrentUser 실패:", error);
    clearAuthTokens();
    return null;
  }
}

/**
 * Clear all auth tokens from localStorage
 */
function clearAuthTokens(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

/**
 * Logout
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

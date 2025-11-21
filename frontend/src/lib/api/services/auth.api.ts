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
  const response = await apiClient<{
    id: string;
    email: string;
    name: string;
    picture: null;
    createdAt: string;
  }>("/api/auth/me", {
    method: "GET",
  });
  
  // Backend returns { name, email, ... } but we need to map it
  return {
    id: response.id,
    email: response.email,
    name: response.name,
    picture: response.picture || undefined,
    createdAt: response.createdAt,
  };
}

/**
 * Get current user info from JWT token
 * Decodes the JWT token stored in localStorage
 * Returns user info from token payload (fast, no API call)
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("syncnapse_access_token");
  if (!token) {
    localStorage.removeItem("user");
    return null;
  }

  try {
    // JWT 토큰 형식 검증 (3 parts: header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.warn("[Auth] Invalid JWT token format, removing...");
      localStorage.removeItem("syncnapse_access_token");
      localStorage.removeItem("syncnapse_refresh_token");
      localStorage.removeItem("authToken"); // Also remove authToken
      localStorage.removeItem("refreshToken"); // Also remove refreshToken
      localStorage.removeItem("user");
      return null;
    }

    // JWT 토큰 디코드
    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    // 필수 필드 확인
    if (!decoded || (!decoded.sub && !decoded.id)) {
      console.warn("[Auth] Token missing user ID, removing...");
      localStorage.removeItem("syncnapse_access_token");
      localStorage.removeItem("syncnapse_refresh_token");
      localStorage.removeItem("authToken"); // Also remove authToken
      localStorage.removeItem("refreshToken"); // Also remove refreshToken
      localStorage.removeItem("user");
      return null;
    }

    // 토큰 만료 확인
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn("[Auth] Token expired, removing...");
      localStorage.removeItem("syncnapse_access_token");
      localStorage.removeItem("syncnapse_refresh_token");
      localStorage.removeItem("authToken"); // Also remove authToken
      localStorage.removeItem("refreshToken"); // Also remove refreshToken
      localStorage.removeItem("user");
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
    localStorage.removeItem("syncnapse_refresh_token");
    localStorage.removeItem("authToken"); // Also remove authToken
    localStorage.removeItem("refreshToken"); // Also remove refreshToken
    localStorage.removeItem("user");
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

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
 * Start Google OAuth login
 * Redirects to the backend Google OAuth endpoint
 */
export function getGoogleLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${baseUrl}/api/auth/google`;
}

/**
 * Get current authentication status
 * Checks if the user is authenticated by calling the backend check endpoint
 */
export async function checkAuthStatus(): Promise<{ ok: boolean }> {
  return apiClient<{ ok: boolean }>("/api/auth/check", {
    headers: getAuthHeaders(),
  });
}

/**
 * Get current user info from JWT token
 * Decodes the JWT token stored in localStorage
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    // JWT 토큰 디코드 (간단한 방식: payload 부분만 추출)
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");

    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    // 토큰 만료 확인
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return null;
    }

    // 사용자 정보 반환 (토큰에 포함된 정보)
    return {
      id: decoded.sub || decoded.id,
      email: decoded.email || "",
      name: decoded.name || "User",
    };
  } catch (error) {
    localStorage.removeItem("authToken");
    return null;
  }
}

/**
 * Logout
 * Calls backend logout endpoint and removes local tokens
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    await apiClient<{ message: string }>("/api/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    // 항상 로컬 토큰 제거
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
}

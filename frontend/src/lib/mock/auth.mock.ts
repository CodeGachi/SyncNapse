/**
 * Mock authentication service
 * Used for development when the backend is not available
 */

import type { User, LoginResponse } from "../api/services/auth.api";

const MOCK_USER: User = {
  id: "mock-user-123",
  email: "test@example.com",
  name: "테스트 사용자",
  picture: undefined, // Mock 모드에서는 프로필 이미지 없음
  createdAt: new Date().toISOString(),
};

/**
 * Mock Google login
 * Performs immediate login instead of opening a popup window
 */
export async function mockGoogleLogin(): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 구버전 데이터 정리
  const oldUser = localStorage.getItem("user");
  if (oldUser) {
    try {
      const parsed = JSON.parse(oldUser);
      // via.placeholder.com URL이 있으면 제거
      if (parsed.picture?.includes("via.placeholder.com")) {
        localStorage.removeItem("user");
      }
    } catch (e) {
      // 파싱 실패 시 제거
      localStorage.removeItem("user");
    }
  }

  const token = `mock-jwt-token-${Date.now()}`;

  localStorage.setItem("syncnapse_access_token", token);
  localStorage.setItem("user", JSON.stringify(MOCK_USER));

  document.cookie = `syncnapse_access_token=${token}; path=/; max-age=86400`;

  return {
    user: MOCK_USER,
    token,
  };
}

/**
 * Mock user data lookup
 */
export async function mockGetCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("syncnapse_access_token");
  if (!token) return null;

  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  return JSON.parse(userStr);
}

/**
 * Mock logout
 */
export async function mockLogout(): Promise<void> {
  localStorage.removeItem("syncnapse_access_token");
  localStorage.removeItem("syncnapse_refresh_token");
  localStorage.removeItem("user");

  document.cookie = "syncnapse_access_token=; path=/; max-age=0";
}

/**
 * Mock validation of authentication tokens
 */
export async function mockVerifyToken(token: string): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    user: MOCK_USER,
    token,
  };
}

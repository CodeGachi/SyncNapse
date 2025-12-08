/**
 * Mock authentication service
 * Used for development when the backend is not available
 */

import type { User, LoginResponse } from "../api/services/auth.api";
import { setAccessToken, getAccessToken, clearTokens } from "../auth/token-manager";
import { setCookie, getCookie } from "../utils/cookie";
import { AUTH_CONFIG } from "@/lib/constants/config";

const MOCK_USER: User = {
  id: "mock-user-123",
  email: "test@example.com",
  name: "테스트 사용자",
  createdAt: new Date().toISOString(),
};

/**
 * Mock Google login
 * Performs immediate login instead of opening a popup window
 */
export async function mockGoogleLogin(): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, AUTH_CONFIG.MOCK_AUTH_DELAY_MS));

  const token = `mock-jwt-token-${Date.now()}`;

  setAccessToken(token);
  setCookie("user", JSON.stringify(MOCK_USER), 60 * 60 * 24);

  return {
    user: MOCK_USER,
    token,
  };
}

/**
 * Mock user data lookup
 */
export async function mockGetCurrentUser(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) return null;

  const userStr = getCookie("user");
  if (!userStr) return null;

  return JSON.parse(userStr);
}

/**
 * Mock logout
 */
export async function mockLogout(): Promise<void> {
  clearTokens();
  setCookie("user", "", 0);
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

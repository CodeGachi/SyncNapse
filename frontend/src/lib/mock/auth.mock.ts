/**
 * Mock authentication service
 * Used for development when the backend is not available
 */

import type { User, LoginResponse } from "../api/auth.api";

const MOCK_USER: User = {
  id: "mock-user-123",
  email: "test@example.com",
  name: "테스트 사용자",
  picture: "https://via.placeholder.com/150",
  createdAt: new Date().toISOString(),
};

/**
 * Mock Google login
 * Performs immediate login instead of opening a popup window
 */
export async function mockGoogleLogin(): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const token = `mock-jwt-token-${Date.now()}`;

  localStorage.setItem("authToken", token);
  localStorage.setItem("user", JSON.stringify(MOCK_USER));

  document.cookie = `authToken=${token}; path=/; max-age=86400`;    

  return {
    user: MOCK_USER,
    token,
  };
}

/**
 * Mock user data lookup
 */
export async function mockGetCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  return JSON.parse(userStr);
}

/**
 * Mock logout
 */
export async function mockLogout(): Promise<void> {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");

  document.cookie = "authToken=; path=/; max-age=0";
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

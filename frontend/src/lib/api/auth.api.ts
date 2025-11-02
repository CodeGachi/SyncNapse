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
 * Returns the URL to redirect to the backend Google OAuth endpoint
 */
export function getGoogleLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${baseUrl}/api/auth/google/login`;
}

/**
 * Token exchange after OAuth callback
 * Exchanges the authorization code received from the backend for a JWT token
 */
export async function exchangeCodeForToken(code: string): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/api/auth/google/callback", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/**
* token Validation * URL Include token Validationand User Information Return */ export async function verifyToken(token: string): Promise<LoginResponse> { return apiClient<LoginResponse>("/api/auth/verify", {    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Current Login User Information Query */ export async function getCurrentUser(): Promise<User> {
  return apiClient<User>("/api/auth/me", {
    headers: getAuthHeaders(),
  });
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  return apiClient<void>("/api/auth/logout", {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

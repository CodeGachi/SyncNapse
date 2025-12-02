/**
 * SyncNapse Authentication API
 * Authentication-related API functions that communicate with the backend
 */

import { apiClient, getAuthHeaders } from "./client";
import { getRefreshToken, setAccessToken, setRefreshToken } from "@/lib/auth/token-manager";

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

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Start Google OAuth login
 * Returns the URL to redirect to the backend Google OAuth endpoint
 */
export function getGoogleLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${baseUrl}/api/auth/google`;
}

/**
 * Token exchange after OAuth callback
 * Exchanges the authorization code for tokens via backend callback URL
 */
export async function exchangeCodeForToken(code: string, state: string): Promise<OAuthTokenResponse> {
  // Call backend callback URL with code and state
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const response = await fetch(`${baseUrl}/api/auth/google/callback?code=${code}&state=${state}`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }
  
  return response.json();
}

/**
 * Token validation
 * URL includes token validation and returns user information
 */
export async function verifyToken(token: string): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Current logged in user information query
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient<User>("/api/auth/me", {
    headers: getAuthHeaders(),
  });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<OAuthTokenResponse> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();

  // Update tokens in cookies
  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }

  return data;
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

/**
 * Restore soft-deleted account
 */
export async function restoreAccount(token: string): Promise<void> {
  return apiClient<void>("/api/auth/restore", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Permanently delete account
 */
export async function permanentDeleteAccount(token: string): Promise<void> {
  return apiClient<void>("/api/auth/permanent-delete", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

/**
 * Delete account response type
 */
export interface DeleteAccountResponse {
  message: string;
  restorationToken: string;
}

/**
 * Delete account (soft delete)
 * Returns a restoration token valid for 30 days
 */
export async function deleteAccount(): Promise<DeleteAccountResponse> {
  return apiClient<DeleteAccountResponse>("/api/users/me", {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}


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
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<OAuthTokenResponse> {
  const refreshToken = localStorage.getItem("refreshToken");
  
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }
  
  const data = await response.json();
  
  // Update tokens in localStorage
  localStorage.setItem("authToken", data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
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

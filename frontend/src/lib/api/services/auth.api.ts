/**
 * Authentication API Service (HATEOAS)
 * Uses HAL links for navigation instead of hardcoded URLs
 */

import { createLogger } from "@/lib/utils/logger";
import { 
  halFetchUrl, 
  getRootUrl, 
  HalResource,
  HalError,
  getApiBaseUrl,
  discoverApi,
} from "../hal";
import { 
  getValidAccessToken, 
  clearTokens, 
  getRefreshToken, 
  setAccessToken, 
  setRefreshToken 
} from "@/lib/auth/token-manager";

const log = createLogger("Auth");

// ==========================================
// Types
// ==========================================

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

export interface DeleteAccountResponse {
  message: string;
  restorationToken: string;
}

// HAL Resource types
interface UserResource extends HalResource {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  picture?: string | null;
  createdAt: string;
}

interface AuthCheckResource extends HalResource {
  ok: boolean;
}

// ==========================================
// Auth Functions (HATEOAS)
// ==========================================

/**
 * Get Google OAuth login URL
 * Follows 'login' link from API root
 */
export async function getGoogleLoginUrl(): Promise<string> {
  const url = await getRootUrl("login");
  if (!url) {
    // Fallback if discovery fails
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/auth/google`;
  }
  log.info("Google OAuth URL:", url);
  return url;
}

/**
 * Check authentication status
 * Uses auth link from root
 */
export async function checkAuthStatus(): Promise<{ ok: boolean }> {
  const baseUrl = getApiBaseUrl();
  const response = await halFetchUrl<AuthCheckResource>(
    `${baseUrl}/auth/check`,
    { method: "GET" }
  );
  return { ok: response.ok };
}

/**
 * Get current user from API
 * Follows 'profile' link from root
 */
export async function getCurrentUserFromAPI(): Promise<User> {
  log.debug("Calling GET /users/me...");
  
  const url = await getRootUrl("profile");
  if (!url) {
    throw new HalError("Profile link not found", 404);
  }

  const response = await halFetchUrl<UserResource>(url, { method: "GET" });

  log.debug("GET /users/me response:", response);

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
 * Uses 'update' action from user resource
 */
export interface UpdateUserDto {
  displayName?: string;
}

export async function updateUserProfile(data: UpdateUserDto): Promise<User> {
  log.debug("Calling PATCH /users/me with:", data);
  
  const url = await getRootUrl("profile");
  if (!url) {
    throw new HalError("Profile link not found", 404);
  }

  const response = await halFetchUrl<UserResource>(url, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  log.debug("PATCH /users/me response:", response);

  return {
    id: response.id,
    email: response.email,
    name: response.displayName || response.name || "User",
    picture: response.picture || undefined,
    createdAt: response.createdAt,
  };
}

/**
 * Get current user
 * Validates token and fetches user data
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getValidAccessToken();

    if (!token) {
      log.debug("No valid token available");
      return null;
    }

    try {
      const user = await getCurrentUserFromAPI();
      log.debug("Fetched user from API:", user);
      return user;
    } catch (apiError) {
      log.warn("API call failed, falling back to token data:", apiError);

      // Fallback to token data
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
    log.error("getCurrentUser failed:", error);
    clearTokens();
    return null;
  }
}

/**
 * Logout
 * Follows 'logout' link from root
 */
export async function logout(): Promise<void> {
  try {
    const url = await getRootUrl("logout");
    if (url) {
      await halFetchUrl<HalResource>(url, { method: "POST" });
    }
  } finally {
    clearTokens();
  }
}

/**
 * Exchange OAuth code for tokens
 * Uses auth callback endpoint
 */
export async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<OAuthTokenResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/auth/google/callback?code=${code}&state=${state}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  return response.json();
}

/**
 * Verify token
 */
export async function verifyToken(token: string): Promise<LoginResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await halFetchUrl<HalResource & LoginResponse>(
    `${baseUrl}/auth/verify`,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    }
  );
  return response;
}

/**
 * Refresh access token
 * Follows 'refresh' link from root
 */
export async function refreshAccessToken(): Promise<OAuthTokenResponse> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const url = await getRootUrl("refresh");
  if (!url) {
    throw new HalError("Refresh link not found", 404);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Refresh-Token": refreshToken,
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();

  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }

  return data;
}

/**
 * Restore soft-deleted account
 */
export async function restoreAccount(token: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  await halFetchUrl<HalResource>(
    `${baseUrl}/auth/restore`,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    }
  );
}

/**
 * Permanently delete account
 */
export async function permanentDeleteAccount(token: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  await halFetchUrl<HalResource>(
    `${baseUrl}/auth/permanent-delete`,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    }
  );
}

/**
 * Delete account (soft delete)
 */
export async function deleteAccount(): Promise<DeleteAccountResponse> {
  const url = await getRootUrl("profile");
  if (!url) {
    throw new HalError("Profile link not found", 404);
  }

  const response = await halFetchUrl<HalResource & DeleteAccountResponse>(
    url,
    { method: "DELETE" }
  );
  return response;
}

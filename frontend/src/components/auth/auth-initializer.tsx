/**
 * Auth Initializer Component
 * Initializes authentication on app startup
 * - Syncs tokens from cookies to localStorage
 * - Validates token format
 */

"use client";

import { useEffect } from "react";

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export function AuthInitializer() {
  useEffect(() => {
    console.log('[AuthInitializer] Initializing authentication...');

    // 1. Sync tokens from cookies to localStorage
    const cookieToken = getCookie("authToken");
    const localToken = localStorage.getItem("authToken");

    console.log('[AuthInitializer] Cookie token exists:', !!cookieToken);
    console.log('[AuthInitializer] LocalStorage token exists:', !!localToken);

    // If cookie has token but localStorage doesn't, sync it
    if (cookieToken && !localToken) {
      console.log('[AuthInitializer] Syncing token from cookie to localStorage');
      localStorage.setItem("authToken", cookieToken);

      // For mock auth, also set a default user
      if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true") {
        const mockUser = {
          id: "mock-user-123",
          email: "test@example.com",
          name: "테스트 사용자",
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem("user", JSON.stringify(mockUser));
        console.log('[AuthInitializer] Mock user data synced');
      }
    }

    // 2. Clean up user data with invalid picture field
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        // Remove picture field if it exists (to avoid Next.js image host errors)
        if (userData.picture) {
          console.log('[AuthInitializer] Removing picture field from user data');
          delete userData.picture;
          localStorage.setItem("user", JSON.stringify(userData));
        }
      } catch (error) {
        console.error('[AuthInitializer] Failed to parse user data:', error);
      }
    }

    // 3. Clean up any invalid tokens
    const token = localStorage.getItem("authToken");
    if (token) {
      // Validate token format (must be JWT with 3 parts or mock token)
      if (!token.startsWith("mock-") && token.split(".").length !== 3) {
        console.warn("[AuthInitializer] Invalid token format detected, cleaning up...");
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }

    console.log('[AuthInitializer] Initialization complete');
  }, []);

  return null;
}


/**
 * Auth Initializer Component
 * Initializes authentication on app startup
 */

"use client";

import { useEffect } from "react";

export function AuthInitializer() {
  useEffect(() => {
    // Clean up any invalid tokens on app startup
    const token = localStorage.getItem("authToken");
    if (token) {
      // Validate token format (must be JWT with 3 parts)
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.warn("[Auth] Invalid token format detected, cleaning up...");
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  return null;
}


"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/services/auth.api";
import { AuthLoading } from "./auth-loading";

export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        alert("로그인에 실패했습니다.");
        router.replace("/");
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // Store tokens in localStorage (use syncnapse_ prefix for consistency with auth.api.ts)
          localStorage.setItem("syncnapse_access_token", accessToken);
          localStorage.setItem("syncnapse_refresh_token", refreshToken);
          localStorage.setItem("authToken", accessToken); // Keep for middleware compatibility
          localStorage.setItem("refreshToken", refreshToken); // Keep for backward compatibility

          // Store token in cookie for SSR
          document.cookie = `authToken=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
          document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`;
          
          // Fetch user info and update React Query cache
          const user = await getCurrentUser();
          queryClient.setQueryData(["auth", "currentUser"], user);
          
          // Redirect to original page or dashboard
          const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
          localStorage.removeItem("redirectAfterLogin"); // Clean up
          
          // console.log("[OAuthCallback] ✅ Login successful, redirecting to:", redirectUrl);
          router.replace(redirectUrl);
        } catch (error) {
          console.error("Failed to fetch user info:", error);
          alert("사용자 정보를 가져오는데 실패했습니다.");
          router.replace("/");
        }
      } else {
        router.replace("/");
      }
      
      setIsProcessing(false);
    };

    processCallback();
  }, [searchParams, router, queryClient]);

  return <AuthLoading />;
}

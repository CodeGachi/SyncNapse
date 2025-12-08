/**
 * OAuth 콜백 훅
 * oauth-callback.tsx에서 분리된 비즈니스 로직
 */

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/services/auth.api";
import { setAccessToken, setRefreshToken } from "@/lib/auth/token-manager";
import { getCookie, setCookie } from "@/lib/utils/cookie";

export function useOAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const processCallback = async () => {
      const accessToken = searchParams?.get("accessToken");
      const refreshToken = searchParams?.get("refreshToken");
      const errorParam = searchParams?.get("error");

      if (errorParam) {
        alert("로그인에 실패했습니다.");
        router.replace("/");
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // 1. 쿠키에 토큰 저장
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);

          // 2. 사용자 정보 조회 및 캐시 업데이트
          const user = await getCurrentUser();
          queryClient.setQueryData(["auth", "currentUser"], user);

          // 3. 리다이렉트
          const redirectUrl =
            getCookie("redirectAfterLogin") || "/dashboard/main";
          if (getCookie("redirectAfterLogin")) {
            setCookie("redirectAfterLogin", "", 0); // 삭제
          }
          router.replace(redirectUrl);
        } catch {
          alert("사용자 정보를 가져오는데 실패했습니다.");
          router.replace("/");
        }
      } else {
        router.replace("/");
      }
    };

    processCallback();
  }, [searchParams, router, queryClient]);
}

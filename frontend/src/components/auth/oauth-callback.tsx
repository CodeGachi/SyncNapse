/**
 * OAuth 콜백 컴포넌트
 * OAuth 인증 후 토큰 저장 및 리다이렉트 처리
 */
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/services/auth.api";
import { setCookie } from "@/lib/utils/cookie";
import { AuthLoading } from "./auth-loading";

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7일

export function OAuthCallback() {
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
          // 1. localStorage에 accessToken만 저장
          // refreshToken은 백엔드가 httpOnly 쿠키로 관리
          localStorage.setItem("authToken", accessToken);

          // 2. authToken만 쿠키에 저장 (미들웨어 호환)
          // refreshToken은 백엔드가 이미 httpOnly 쿠키로 설정함
          setCookie("authToken", accessToken, ACCESS_TOKEN_MAX_AGE);

          // 3. 사용자 정보 조회 및 캐시 업데이트
          const user = await getCurrentUser();
          queryClient.setQueryData(["auth", "currentUser"], user);

          // 4. 리다이렉트
          const redirectUrl =
            localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
          localStorage.removeItem("redirectAfterLogin");
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

  return <AuthLoading />;
}

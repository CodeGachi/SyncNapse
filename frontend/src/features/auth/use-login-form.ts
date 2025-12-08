/**
 * 로그인 폼 훅
 * login-form.tsx에서 분리된 비즈니스 로직
 */

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("Login");

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  // 쿼리 파라미터에서 리다이렉트 URL 저장
  useEffect(() => {
    // returnUrl 또는 callbackUrl 파라미터 지원
    const returnUrl = searchParams?.get("returnUrl") || searchParams?.get("callbackUrl");
    if (returnUrl && returnUrl !== "/" && !returnUrl.startsWith("/auth")) {
      localStorage.setItem("redirectAfterLogin", returnUrl);
      log.debug("리다이렉트 URL 저장:", returnUrl);
    }
  }, [searchParams]);

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
      localStorage.removeItem("redirectAfterLogin");
      log.info("이미 인증됨, 리다이렉트:", redirectUrl);
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, loading, router]);

  return {
    isAuthenticated,
    loading,
  };
}

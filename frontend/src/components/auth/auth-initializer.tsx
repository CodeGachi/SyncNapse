/**
 * 인증 초기화 컴포넌트
 * 앱 시작 시 토큰 유효성 검사
 */

"use client";

import { useEffect } from "react";
import { getAccessToken, clearTokens } from "@/lib/auth/token-manager";
import { deleteCookie } from "@/lib/utils/cookie";
import { logger } from "@/lib/utils/logger";

export function AuthInitializer() {
  useEffect(() => {
    // 잘못된 토큰 형식 정리
    const token = getAccessToken();
    if (token) {
      // JWT 형식 검증 (mock 토큰 또는 3파트 JWT)
      if (!token.startsWith("mock-") && token.split(".").length !== 3) {
        logger.warn("[AuthInitializer] 잘못된 토큰 형식, 정리 중...");
        clearTokens();
        deleteCookie("user");
      } else {
        logger.debug("[AuthInitializer] 토큰 동기화 완료");
      }
    }
  }, []);

  return null;
}

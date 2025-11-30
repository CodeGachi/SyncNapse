/**
 * 인증 초기화 컴포넌트
 * 앱 시작 시 쿠키에서 토큰을 localStorage로 동기화
 */

"use client";

import { useEffect } from "react";
import { getCookie } from "@/lib/utils/cookie";
import { logger } from "@/lib/utils/logger";

const TOKEN_KEY = "authToken";

export function AuthInitializer() {
  useEffect(() => {
    // 1. 쿠키에서 localStorage로 토큰 동기화
    const cookieToken = getCookie(TOKEN_KEY);
    const localToken = localStorage.getItem(TOKEN_KEY);

    if (cookieToken && !localToken) {
      localStorage.setItem(TOKEN_KEY, cookieToken);
      logger.debug("[AuthInitializer] 토큰 동기화 완료");
    }

    // 2. picture 필드 정리 (Next.js Image 호스트 에러 방지)
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.picture) {
          delete userData.picture;
          localStorage.setItem("user", JSON.stringify(userData));
          logger.debug("[AuthInitializer] picture 필드 제거");
        }
      } catch {
        // JSON 파싱 실패 시 무시
      }
    }

    // 3. 잘못된 토큰 형식 정리
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      // JWT 형식 검증 (mock 토큰 또는 3파트 JWT)
      if (!token.startsWith("mock-") && token.split(".").length !== 3) {
        logger.warn("[AuthInitializer] 잘못된 토큰 형식, 정리 중...");
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  return null;
}

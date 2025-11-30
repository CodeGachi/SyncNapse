/**
 * 로그아웃 핸들러 컴포넌트
 * 로그아웃 처리 및 리다이렉트 담당
 */
"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/services/auth.api";
import { deleteCookie } from "@/lib/utils/cookie";
import { LoadingScreen } from "@/components/common/loading-screen";

export function LogoutHandler() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("로그아웃 중...");

  useEffect(() => {
    const performLogout = async () => {
      // 1. localStorage 토큰 제거
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      // 2. 쿠키 삭제 (미들웨어 호환)
      deleteCookie("authToken");
      deleteCookie("refreshToken");

      // 3. React Query 캐시 초기화
      queryClient.clear();

      // 4. 백엔드 로그아웃 (실패 무시)
      try {
        await logout();
      } catch {
        // 무시
      }

      setStatus("로그인 페이지로 이동 중...");
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = "/login";
    };

    performLogout();
  }, [queryClient]);

  return <LoadingScreen fullScreen message={status} />;
}

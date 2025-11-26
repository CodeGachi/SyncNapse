"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/services/auth.api";
import { LoadingScreen } from "@/components/common/loading-screen";

export function LogoutHandler() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("로그아웃 중...");

  useEffect(() => {
    const performLogout = async () => {
      // 1. 먼저 localStorage 토큰 제거 (API 호출 전에)
      console.log("[Logout] Clearing local storage first...");
      localStorage.removeItem("syncnapse_access_token");
      localStorage.removeItem("syncnapse_refresh_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      // 쿠키도 삭제 (미들웨어에서 체크하기 때문)
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // 2. React Query 캐시 완전 초기화
      console.log("[Logout] Clearing React Query cache...");
      queryClient.removeQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["notes"] });
      queryClient.removeQueries({ queryKey: ["folders"] });
      queryClient.clear();

      // 3. 백엔드 로그아웃 API 호출 (실패해도 계속 진행)
      try {
        await logout();
        console.log("[Logout] Backend logout completed");
      } catch (error) {
        console.warn("[Logout] Backend logout failed (ignored):", error);
      }

      setStatus("로그인 페이지로 이동 중...");

      // 4. 약간의 지연 후 리다이렉트 (캐시 정리 확실히)
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("[Logout] Redirecting to login...");

      // window.location을 사용하여 완전한 페이지 새로고침
      window.location.href = "/login";
    };

    performLogout();
  }, [queryClient]);

  return <LoadingScreen fullScreen message={status} />;
}

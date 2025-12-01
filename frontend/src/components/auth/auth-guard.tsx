/**
 * 인증 가드 컴포넌트
 *
 * 인증되지 않은 사용자를 로그인 페이지로 리다이렉트
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { LoadingScreen } from "@/components/common/loading-screen";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("AuthGuard");

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  // 인증 상태 디버그 로깅
  useEffect(() => {
    log.debug("인증 상태:", { loading, isAuthenticated, user: user?.email });
  }, [loading, isAuthenticated, user]);

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      log.info("미인증 상태, 로그인 페이지로 리다이렉트");
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  // 인증 확인 중 로딩 표시
  if (loading) {
    log.debug("인증 확인 중...");
    return <LoadingScreen fullScreen message="인증 확인 중..." />;
  }

  // 미인증 시 렌더링 안함
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

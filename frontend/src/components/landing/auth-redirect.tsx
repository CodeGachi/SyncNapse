"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { LoadingScreen } from "@/components/common/loading-screen";

interface AuthRedirectProps {
  children: React.ReactNode;
}

/**
 * 인증된 사용자를 대시보드로 리다이렉트하는 컴포넌트
 * 로딩 중에는 LoadingScreen 표시
 */
export function AuthRedirect({ children }: AuthRedirectProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard/main");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <LoadingScreen fullScreen message="로딩 중..." />;
  }

  return <>{children}</>;
}

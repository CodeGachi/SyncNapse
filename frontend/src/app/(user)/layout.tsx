"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { LoadingScreen } from "@/components/common/loading-screen";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('[UserLayout] Auth state:', { loading, isAuthenticated, user });
  }, [loading, isAuthenticated, user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[UserLayout] Not authenticated, redirecting to login');
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    console.log('[UserLayout] Loading authentication...');
    console.log('[UserLayout] Loading authentication...');
    return <LoadingScreen fullScreen message="인증 확인 중..." />;
  }
  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

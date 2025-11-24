"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

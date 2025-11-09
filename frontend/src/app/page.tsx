"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { useAuth } from "@/features/auth/use-auth";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  // Save redirect URL from query parameter
  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl && callbackUrl !== "/" && !callbackUrl.startsWith("/auth")) {
      localStorage.setItem("redirectAfterLogin", callbackUrl);
      console.log("[Home] 💾 Saved redirect URL from query:", callbackUrl);
    }
  }, [searchParams]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if there's a saved redirect URL
      const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard/main";
      localStorage.removeItem("redirectAfterLogin");
      console.log("[Home] ✅ Already authenticated, redirecting to:", redirectUrl);
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </main>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900">SyncNapse</h1>
            <p className="text-xl text-gray-600">
             스마트한 필기 서비스로 학습을 더 효율적으로
            </p>
          </div>
          <GoogleLoginButton />
          <div className="text-gray-500 text-sm">
            AI 기반 필기 정리와 학습 도구를 경험하세요
          </div>
        </div>
      </main>
    );
  }

  return null;
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}

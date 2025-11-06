"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { useAuth } from "@/features/auth/use-auth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard/main");
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

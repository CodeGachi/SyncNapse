/**
 * Auth Error Component
 * Error state for authentication processes
 */

"use client";

import { useRouter } from "next/navigation";

interface AuthErrorProps {
  error: string;
}

export function AuthError({ error }: AuthErrorProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인 실패</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => router.replace("/login")}
          className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          로그인 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}

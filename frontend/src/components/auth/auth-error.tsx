/**
 * 인증 오류 컴포넌트
 * 인증 과정에서 발생한 오류 상태를 표시
 */

"use client";

import { useRouter } from "next/navigation";

interface AuthErrorProps {
  error: string;
}

export function AuthError({ error }: AuthErrorProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base">
      <div className="max-w-md w-full bg-background-elevated rounded-lg border border-status-error/30 p-8 text-center">
        <div className="text-status-error text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">로그인 실패</h1>
        <p className="text-foreground-secondary mb-6">{error}</p>
        <button
          onClick={() => router.replace("/login")}
          className="w-full px-4 py-3 bg-brand hover:bg-brand-hover text-black rounded-lg font-medium transition-colors"
        >
          로그인 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}

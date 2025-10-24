/**
 * OAuth Callback Page
 *
 * Google OAuth 로그인 후 리다이렉트되는 페이지
 * URL에서 인증 코드를 받아서 백엔드로 전송하고 토큰을 받아옴
 */

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleLogin } from "@/features/auth/google-login";

// Dynamic route segment config
export const dynamic = "force-dynamic";

// Suspense로 감싸진 실제 콜백 처리 컴포넌트
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleCodeExchange, loading, error } = useGoogleLogin();

  useEffect(() => {
    // URL에서 인증 코드 가져오기
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      // OAuth 에러 처리
      console.error("OAuth 에러:", errorParam);
      alert("로그인에 실패했습니다.");
      router.replace("/");
      return;
    }

    if (code) {
      // 인증 코드를 백엔드로 전송
      console.log("[OAuth] 인증 코드 수신:", code.substring(0, 10) + "...");
      handleCodeExchange(code);
    } else {
      // 코드가 없으면 홈으로
      console.error("[OAuth] 인증 코드가 없습니다.");
      router.replace("/");
    }
  }, [searchParams, handleCodeExchange, router]);

  // 에러 화면
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인 실패</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 로딩 화면
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 처리 중...</h2>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

// Suspense fallback 컴포넌트
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 처리 중...</h2>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

// 메인 컴포넌트 (Suspense로 감싸기)
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackContent />
    </Suspense>
  );
}

/**
 * SyncNapse Google OAuth 로그인 기능 훅
 *
 * 백엔드 연동을 대비한 구조:
 * - 개발 모드 (NEXT_PUBLIC_USE_MOCK_AUTH=true): Mock 데이터 사용
 * - 프로덕션 (NEXT_PUBLIC_USE_MOCK_AUTH=false): 실제 백엔드 API 사용
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockGoogleLogin, mockLogout } from "@/lib/mock/auth.mock";
import { getGoogleLoginUrl, logout } from "@/lib/api/auth.api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function useGoogleLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Google 로그인 시작
   *
   * Mock 모드: 즉시 로그인 처리 (2초 딜레이)
   * Real 모드: 백엔드 OAuth 엔드포인트로 리다이렉트
   */
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      if (USE_MOCK) {
        // ===== Mock 모드 (개발용) =====
        console.log("[Mock] Google 로그인 시작...");
        const { user, token } = await mockGoogleLogin();

        console.log("[Mock] 로그인 성공:", {
          email: user.email,
          name: user.name,
        });

        // 대시보드로 리다이렉트
        window.location.href = "/dashboard";
      } else {
        // ===== Real 모드 (백엔드 연동) =====
        console.log("[Real] Google OAuth 시작...");

        // 현재 페이지 URL 저장 (로그인 후 돌아오기 위함)
        sessionStorage.setItem("auth_redirect", window.location.pathname);

        // 백엔드 Google OAuth URL로 리다이렉트
        const loginUrl = getGoogleLoginUrl();
        console.log("[Real] 리다이렉트:", loginUrl);

        window.location.href = loginUrl;
      }
    } catch (err: any) {
      console.error("로그인 실패:", err);
      setError(err.message || "로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      // Real 모드에서는 페이지가 리다이렉트되므로 finally가 실행 안 됨
      if (USE_MOCK) {
        setLoading(false);
      }
    }
  };

  /**
   * 로그아웃
   */
  const handleLogout = async () => {
    setLoading(true);

    try {
      if (USE_MOCK) {
        await mockLogout();
        console.log("[Mock] 로그아웃 완료");
      } else {
        await logout();
        console.log("[Real] 로그아웃 완료");
      }

      // 페이지 새로고침으로 로그인 화면 표시
      window.location.href = "/";
    } catch (err: any) {
      console.error("로그아웃 실패:", err);
      setError("로그아웃에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return {
    handleGoogleLogin,
    handleLogout,
    loading,
    error,
  };
}

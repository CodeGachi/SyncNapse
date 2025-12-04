/**
 * 공유 노트 접속 페이지
 *
 * 공유 링크로 접속 시 이 페이지를 통해 educator 노트 페이지로 리다이렉트됩니다.
 * 토큰 형식: {noteId}-{timestamp}-{randomString}
 *
 * 흐름:
 * 1. 로그인 여부 확인
 * 2. 미로그인 시 → 로그인 페이지로 리다이렉트 (returnUrl 저장)
 * 3. 로그인됨 → educator 노트 페이지로 리다이렉트
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/common/loading-screen";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";
import { getAccessToken } from "@/lib/auth/token-manager";
import { saveSharedReturnUrl } from "@/lib/utils/shared-return-url";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SharedNote");

interface SharedNotePageProps {
  params: { token: string };
}

export default function SharedNotePage({ params }: SharedNotePageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 현재 사용자 정보 조회
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();

  useEffect(() => {
    // 사용자 정보 로딩 중이면 대기
    if (isUserLoading) {
      return;
    }

    // 토큰 확인
    const token = getAccessToken();
    const isAuthenticated = !!token && !!currentUser;

    setIsCheckingAuth(false);

    // 미로그인 시 로그인 페이지로 리다이렉트
    if (!isAuthenticated) {
      // 현재 URL을 저장하여 로그인 후 복귀
      const currentUrl = window.location.href;
      saveSharedReturnUrl(currentUrl);

      log.info("로그인 필요 - 로그인 페이지로 이동", { currentUrl });

      // 로그인 페이지로 리다이렉트
      router.push(`/login?returnUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // 로그인된 사용자 - 노트 페이지로 리다이렉트
    try {
      // 토큰에서 noteId 추출
      // 토큰 형식 1: 순수 UUID (예: 533297d0-935f-4b59-b9a2-c722863c947d) - 36자, 하이픈 5개 부분
      // 토큰 형식 2: {noteId}-{timestamp}-{randomString} - 7개 이상 부분
      const parts = params.token.split("-");

      if (parts.length < 5) {
        setError("유효하지 않은 공유 링크입니다.");
        return;
      }

      let noteId: string;

      // UUID는 정확히 5개 부분 (8-4-4-4-12 형식), 총 36자
      const isValidUUID = parts.length === 5 && params.token.length === 36;

      if (isValidUUID) {
        // 순수 UUID 형식 - 토큰 전체가 noteId
        noteId = params.token;
      } else if (parts.length >= 7) {
        // {noteId}-{timestamp}-{randomString} 형식
        // 마지막 2개 부분은 timestamp와 randomString
        noteId = parts.slice(0, parts.length - 2).join("-");
      } else {
        setError("유효하지 않은 공유 링크입니다.");
        return;
      }

      if (!noteId) {
        setError("노트 ID를 찾을 수 없습니다.");
        return;
      }

      log.debug("토큰 파싱 완료:", {
        원본토큰: params.token,
        parts,
        noteId,
        noteIdLength: noteId.length,
        user: currentUser?.email,
      });

      // educator 노트 페이지로 리다이렉트 (공유 모드)
      const redirectUrl = `/note/educator/${noteId}?view=shared&token=${params.token}`;
      log.info("리다이렉트:", redirectUrl);
      router.push(redirectUrl);
    } catch (err) {
      log.error("공유 링크 처리 오류:", err);
      setError("공유 링크 처리 중 오류가 발생했습니다.");
    }
  }, [params.token, router, currentUser, isUserLoading]);

  // 로딩 중
  if (isUserLoading || isCheckingAuth) {
    return <LoadingScreen fullScreen message="인증 확인 중..." />;
  }

  // 에러 발생
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-base">
        <div className="text-center max-w-md p-8 bg-background-elevated rounded-lg border border-status-error/30">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-status-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">오류 발생</h2>
          <p className="text-foreground-secondary">{error}</p>
          <button
            onClick={() => router.push("/dashboard/main")}
            className="mt-6 px-6 py-2 bg-brand text-black rounded-lg font-medium hover:bg-brand-hover transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen fullScreen message="공유 노트로 이동 중..." />;
}

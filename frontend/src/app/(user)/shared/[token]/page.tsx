/**
 * 공유 노트 접속 페이지
 *
 * 공유 링크로 접속 시 이 페이지를 통해 educator 노트 페이지로 리다이렉트됩니다.
 * 토큰 형식: {noteId}-{timestamp}-{randomString}
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/common/loading-screen";

interface SharedNotePageProps {
  params: { token: string };
}

export default function SharedNotePage({ params }: SharedNotePageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // 토큰에서 noteId 추출
      // 토큰 형식: {noteId}-{timestamp}-{randomString}
      // noteId는 UUID 형식이므로 하이픈을 포함함 (예: 171378db-92da-437e-8512-2af45cf0926e)
      // 따라서 마지막 2개 부분 (timestamp, randomString)을 제외한 나머지를 noteId로 추출
      const parts = params.token.split("-");

      if (parts.length < 3) {
        setError("유효하지 않은 공유 링크입니다.");
        return;
      }

      // 마지막 2개 부분은 timestamp와 randomString
      // 나머지는 noteId (UUID이므로 하이픈으로 join)
      const noteId = parts.slice(0, parts.length - 2).join('-');

      if (!noteId) {
        setError("노트 ID를 찾을 수 없습니다.");
        return;
      }

      console.log(`[Share Token] 토큰 파싱 완료: noteId=${noteId}`);

      // educator 노트 페이지로 리다이렉트 (공유 모드)
      // ?view=shared 파라미터를 추가하여 공유 모드로 접속함을 표시
      const redirectUrl = `/note/educator/${noteId}?view=shared&token=${params.token}`;
      router.push(redirectUrl);
    } catch (err) {
      console.error("공유 링크 처리 오류:", err);
      setError("공유 링크 처리 중 오류가 발생했습니다.");
    }
  }, [params.token, router]);

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

  return (
    <LoadingScreen fullScreen message="공유 노트로 이동 중..." />
  );
}

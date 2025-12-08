/**
 * Short URL Redirect Page
 * Redirects short codes to the actual shared note page
 *
 * shortCode는 noteId의 첫 8자리입니다.
 * 백엔드에서 shortCode로 시작하는 noteId를 검색합니다.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingScreen } from "@/components/common/loading-screen";

export default function ShortCodeRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const shortCode = (params?.shortCode as string) || '';

  useEffect(() => {
    if (!shortCode) return;

    // shortCode를 token으로 사용하여 /shared 페이지로 리다이렉트
    // /shared 페이지에서 shortCode로 시작하는 noteId를 찾아 처리
    router.replace(`/shared/${shortCode}`);
  }, [shortCode, router]);

  return <LoadingScreen fullScreen message="링크 확인 중..." />;
}

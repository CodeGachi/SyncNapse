/**
 * 로그아웃 페이지 (Server Component)
 *
 * 사용자 로그아웃 처리 - 토큰 삭제 후 로그인 페이지로 리다이렉트
 */

import { Suspense } from "react";
import { LogoutHandler } from "@/components/auth/logout-handler";
import { AuthLoading } from "@/components/auth/auth-loading";

// 동적 라우트 세그먼트 설정
export const dynamic = "force-dynamic";

export default function LogoutPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LogoutHandler />
    </Suspense>
  );
}

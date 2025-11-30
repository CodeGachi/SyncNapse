/**
 * OAuth 콜백 페이지 (Server Component)
 *
 * 구글 OAuth 로그인 후 리다이렉트되는 페이지
 * URL에서 인가 코드를 가져와 백엔드로 전송하고 토큰을 받음
 */

import { Suspense } from "react";
import { OAuthCallback } from "@/components/auth/oauth-callback";
import { AuthLoading } from "@/components/auth/auth-loading";

// 동적 라우트 세그먼트 설정
export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <OAuthCallback />
    </Suspense>
  );
}

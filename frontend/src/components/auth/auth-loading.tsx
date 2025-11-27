/**
 * Auth Loading Component
 * Loading state for authentication processes
 */

import { LoadingScreen } from "@/components/common/loading-screen";

export function AuthLoading() {
  return <LoadingScreen fullScreen message="로그인 처리 중..." />;
}

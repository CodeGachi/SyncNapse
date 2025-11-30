/**
 * 인증 로딩 컴포넌트
 * 인증 과정의 로딩 상태를 표시
 */

import { LoadingScreen } from "@/components/common/loading-screen";

export function AuthLoading() {
  return <LoadingScreen fullScreen message="로그인 처리 중..." />;
}

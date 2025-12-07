/**
 * 계정 복구 페이지 (Server Component)
 *
 * 삭제 요청된 계정의 복구 또는 영구 삭제 처리
 */

import { Suspense } from "react";
import { RestoreForm } from "@/components/auth/restore-form";

export const dynamic = "force-dynamic";

export default function RestorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background-deep">
          <div className="text-foreground-secondary">로딩 중...</div>
        </div>
      }
    >
      <RestoreForm />
    </Suspense>
  );
}

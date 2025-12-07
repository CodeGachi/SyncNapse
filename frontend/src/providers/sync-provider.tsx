/**
 * Sync Provider - 자동 동기화 시작
 *
 * 앱 최상위에서 감싸서 사용:
 * - 자동 동기화 시작 (5초 간격)
 * - 앱 종료 시 자동 동기화 중지
 */

"use client";

import { useEffect, ReactNode } from "react";
import { startAutoSync, stopAutoSync } from "@/lib/sync/sync-manager";
import { useSyncStore } from "@/lib/sync/sync-store";
import { useSyncListener } from "@/hooks/use-sync-listener";

interface SyncProviderProps {
  children: ReactNode;
  interval?: number; // 동기화 간격 (ms), 기본 5초
  autoSync?: boolean; // 자동 동기화 활성화 여부, 기본 true
}

export function SyncProvider({
  children,
  interval = 5000,
  autoSync = true,
}: SyncProviderProps) {
  const { setAutoSync, setSyncInterval } = useSyncStore();

  // 동기화 이벤트 리스너 (React Query 캐시 갱신)
  useSyncListener();

  useEffect(() => {
    // 설정 적용
    setAutoSync(autoSync);
    setSyncInterval(interval);

    if (autoSync) {
      // 자동 동기화 시작
      startAutoSync(interval);

      // Cleanup: 컴포넌트 언마운트 시 자동 동기화 중지
      return () => {
        stopAutoSync();
      };
    }
  }, [autoSync, interval, setAutoSync, setSyncInterval]);

  return <>{children}</>;
}

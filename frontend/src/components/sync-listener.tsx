/**
 * Sync Listener Component
 * 서버 동기화 이벤트를 감지하는 컴포넌트
 */
'use client';

import { useSyncListener } from '@/hooks/use-sync-listener';

export function SyncListener() {
  useSyncListener();
  return null;
}


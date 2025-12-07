/**
 * Search Sync Hook
 * 대시보드 진입 시 검색 데이터 동기화
 */

import { useEffect } from "react";
import { useSearchSyncStore } from "@/stores/search-sync-store";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SearchSync");

/**
 * 검색 데이터 동기화 훅
 * 대시보드 layout에서 호출
 */
export function useSearchSync() {
  const { checkAndSync, isSyncing, lastSyncedAt, syncError } = useSearchSyncStore();

  useEffect(() => {
    log.info("Checking search data sync...");
    checkAndSync();
  }, [checkAndSync]);

  return {
    isSyncing,
    lastSyncedAt,
    syncError,
  };
}

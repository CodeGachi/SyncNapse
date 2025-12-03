/**
 * 검색 데이터 동기화 상태 관리 스토어
 * 백엔드 → IndexedDB 동기화 상태 추적
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { syncSearchData, needsSync, type SyncStatus } from "@/lib/db/sync";
import { searchLocal, type SearchResults } from "@/lib/db/search";

interface SearchSyncState {
  // 동기화 상태
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;

  // 동기화 액션
  sync: () => Promise<void>;
  checkAndSync: () => Promise<void>;

  // 검색 기능
  search: (query: string) => Promise<SearchResults>;
}

export const useSearchSyncStore = create<SearchSyncState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,

      // 강제 동기화
      sync: async () => {
        const { isSyncing } = get();
        if (isSyncing) return; // 이미 진행 중이면 스킵

        set({ isSyncing: true, syncError: null });

        try {
          const status = await syncSearchData();
          set({
            isSyncing: false,
            lastSyncedAt: status.lastSyncedAt,
            syncError: status.error,
          });
        } catch (error) {
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : "동기화 실패",
          });
        }
      },

      // 필요 시에만 동기화 (5분 경과 후)
      checkAndSync: async () => {
        const shouldSync = await needsSync();
        if (shouldSync) {
          await get().sync();
        }
      },

      // 로컬 검색
      search: async (query: string) => {
        return await searchLocal(query);
      },
    }),
    { name: "search-sync-store" }
  )
);

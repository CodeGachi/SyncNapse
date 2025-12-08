/**
 * Sync Store - Zustand Store for Sync Status
 *
 * 동기화 상태 관리 (큐, 동기화 중 여부, 마지막 동기화 시간 등)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SyncQueue, SyncQueueItem } from "./sync-queue";
import {
  loadSyncQueue,
  saveSyncQueue,
  addToSyncQueue as addToQueue,
  removeFromSyncQueue,
  incrementRetryCount,
  updateLastSyncTime,
  updateSyncStatus,
  initialSyncQueue,
} from "./sync-queue";

interface SyncStore {
  // State
  queue: SyncQueue;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  syncInterval: number; // milliseconds
  syncError: string | null; // 마지막 동기화 에러
  lastSyncTime: number | null; // 마지막 성공 동기화 시간

  // Actions
  addToSyncQueue: (
    item: Omit<SyncQueueItem, "id" | "timestamp" | "retryCount">
  ) => void;
  removeFromQueue: (itemId: string) => void;
  markItemFailed: (itemId: string, error: string) => void;
  startSync: () => void;
  finishSync: (success: boolean) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (interval: number) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTime: (time: number | null) => void;
  clearQueue: () => void;
  loadQueue: () => void;
  saveQueue: () => void;
}

export const useSyncStore = create<SyncStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      queue: loadSyncQueue(),
      isSyncing: false,
      autoSyncEnabled: true,
      syncInterval: 5000, // 5초
      syncError: null,
      lastSyncTime: null,

      // 큐에 아이템 추가
      addToSyncQueue: (item) => {
        set((state) => {
          const newQueue = addToQueue(state.queue, item);
          saveSyncQueue(newQueue);
          return { queue: newQueue };
        });
      },

      // 큐에서 아이템 제거 (동기화 성공)
      removeFromQueue: (itemId) => {
        set((state) => {
          const newQueue = removeFromSyncQueue(state.queue, itemId);
          saveSyncQueue(newQueue);
          return { queue: newQueue };
        });
      },

      // 아이템 실패 처리
      markItemFailed: (itemId, error) => {
        set((state) => {
          const newQueue = incrementRetryCount(state.queue, itemId, error);
          saveSyncQueue(newQueue);
          return { queue: newQueue };
        });
      },

      // 동기화 시작
      startSync: () => {
        set((state) => ({
          isSyncing: true,
          queue: updateSyncStatus(state.queue, "syncing"),
        }));
      },

      // 동기화 완료
      finishSync: (success) => {
        set((state) => {
          let newQueue = state.queue;
          if (success) {
            newQueue = updateLastSyncTime(newQueue);
            newQueue = updateSyncStatus(newQueue, "idle");
          } else {
            newQueue = updateSyncStatus(newQueue, "error");
          }
          saveSyncQueue(newQueue);
          return {
            isSyncing: false,
            queue: newQueue,
          };
        });
      },

      // 자동 동기화 설정
      setAutoSync: (enabled) => {
        set({ autoSyncEnabled: enabled });
      },

      // 동기화 간격 설정
      setSyncInterval: (interval) => {
        set({ syncInterval: interval });
      },

      // 동기화 에러 설정
      setSyncError: (error) => {
        set({ syncError: error });
      },

      // 마지막 동기화 시간 설정
      setLastSyncTime: (time) => {
        set({ lastSyncTime: time });
      },

      // 큐 초기화
      clearQueue: () => {
        const clearedQueue = { ...initialSyncQueue };
        saveSyncQueue(clearedQueue);
        set({ queue: clearedQueue });
      },

      // 큐 로드
      loadQueue: () => {
        set({ queue: loadSyncQueue() });
      },

      // 큐 저장
      saveQueue: () => {
        const { queue } = get();
        saveSyncQueue(queue);
      },
    }),
    {
      name: "sync-store",
    }
  )
);

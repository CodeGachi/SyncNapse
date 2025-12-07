/**
 * Trash API Service V2 - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * 새로운 구조:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 동기화 큐에 추가
 * 3. 백그라운드에서 백엔드와 동기화
 *
 * 이전 V1 API (trash.api.ts)는 deprecated됨
 */

import type { DBTrashItem } from "@/lib/db/trash";
import {
  getAllTrashItems as getAllTrashItemsFromDB,
  restoreFromTrash as restoreFromTrashDB,
  permanentlyDeleteFromTrash as permanentlyDeleteFromTrashDB,
  cleanupExpiredItems as cleanupExpiredItemsDB,
  emptyTrash as emptyTrashDB,
} from "@/lib/db/trash";
import { useSyncStore } from "@/lib/sync/sync-store";

export type { DBTrashItem };

/**
 * 휴지통 모든 항목 조회
 * - IndexedDB에서 즉시 반환
 * - 오프라인에서도 사용 가능
 */
export async function fetchTrashItems(): Promise<DBTrashItem[]> {
  return await getAllTrashItemsFromDB();
}

/**
 * 휴지통 항목 복원
 * - IndexedDB에서 즉시 복원
 * - 동기화 큐에 추가
 * - 백그라운드에서 백엔드와 동기화
 */
export async function restoreTrashItem(itemId: string): Promise<void> {
  // 1. IndexedDB에서 즉시 복원
  await restoreFromTrashDB(itemId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "trash",
    entityId: itemId,
    operation: "restore",
    data: {
      item_id: itemId,
    },
  });
}

/**
 * 휴지통 항목 영구 삭제
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 * - 백그라운드에서 백엔드와 동기화
 */
export async function permanentlyDeleteTrashItem(itemId: string): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  await permanentlyDeleteFromTrashDB(itemId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "trash",
    entityId: itemId,
    operation: "delete",
    data: {
      item_id: itemId,
    },
  });
}

/**
 * 만료된 휴지통 항목 자동 삭제
 * - IndexedDB에서 15일 초과 항목 삭제
 * - 동기화 큐에 추가
 * - 백그라운드에서 백엔드와 동기화
 */
export async function cleanupExpiredTrashItems(): Promise<number> {
  // 1. IndexedDB에서 만료된 항목 삭제
  const deletedCount = await cleanupExpiredItemsDB();

  // 2. 동기화 큐에 추가 (개수만 동기화)
  if (deletedCount > 0) {
    const syncStore = useSyncStore.getState();
    syncStore.addToSyncQueue({
      entityType: "trash",
      entityId: `cleanup-${Date.now()}`,
      operation: "cleanup",
      data: {
        deleted_count: deletedCount,
        cleaned_at: new Date().toISOString(),
      },
    });
  }

  return deletedCount;
}

/**
 * 휴지통 비우기 (모든 항목 삭제)
 * - IndexedDB에서 모든 항목 삭제
 * - 동기화 큐에 추가
 * - 백그라운드에서 백엔드와 동기화
 */
export async function emptyTrash(): Promise<void> {
  // 1. IndexedDB에서 즉시 비우기
  await emptyTrashDB();

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "trash",
    entityId: `empty-${Date.now()}`,
    operation: "empty",
    data: {
      emptied_at: new Date().toISOString(),
    },
  });
}

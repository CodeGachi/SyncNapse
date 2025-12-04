/**
 * Sync Queue - 동기화 대기 큐 관리
 *
 * IndexedDB → Backend 동기화를 위한 큐 시스템
 * 변경사항을 큐에 추가하고, 백그라운드에서 순차적으로 동기화
 */

import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SyncQueue");

export type SyncOperation =
  | "create"
  | "update"
  | "delete"
  | "restore" // 휴지통 복원
  | "cleanup" // 만료된 항목 삭제
  | "empty"; // 휴지통 비우기

export type SyncEntity =
  | "note"
  | "folder"
  | "file"
  | "recording"
  | "noteContent"
  | "question" // Q&A 질문
  | "answer" // Q&A 답변
  | "trash"; // 휴지통 관련 작업

export interface SyncQueueItem {
  id: string; // 큐 아이템 ID (unique)
  entityType: SyncEntity;
  entityId: string; // 엔티티 ID (노트 ID, 폴더 ID 등)
  operation: SyncOperation;
  data?: any; // 동기화할 데이터
  timestamp: number; // 큐에 추가된 시간
  retryCount: number; // 재시도 횟수
  lastError?: string; // 마지막 에러 메시지
}

export interface SyncQueue {
  items: SyncQueueItem[];
  lastSyncTime: number;
  syncStatus: "idle" | "syncing" | "error";
}

/**
 * 동기화 큐 초기 상태
 */
export const initialSyncQueue: SyncQueue = {
  items: [],
  lastSyncTime: 0,
  syncStatus: "idle",
};

/**
 * LocalStorage 키
 */
const SYNC_QUEUE_KEY = "sync-queue";

/**
 * 동기화 큐 로드 (LocalStorage에서)
 */
export function loadSyncQueue(): SyncQueue {
  if (typeof window === "undefined") return initialSyncQueue;

  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!stored) return initialSyncQueue;

    const parsed = JSON.parse(stored);
    return {
      items: parsed.items || [],
      lastSyncTime: parsed.lastSyncTime || 0,
      syncStatus: "idle", // 항상 idle로 시작
    };
  } catch {
    return initialSyncQueue;
  }
}

/**
 * 동기화 큐 저장 (LocalStorage에)
 */
export function saveSyncQueue(queue: SyncQueue): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    log.error("Failed to save sync queue:", error);
  }
}

/**
 * 큐에 아이템 추가
 */
export function addToSyncQueue(
  queue: SyncQueue,
  item: Omit<SyncQueueItem, "id" | "timestamp" | "retryCount">
): SyncQueue {
  const newItem: SyncQueueItem = {
    ...item,
    id: `${item.entityType}-${item.entityId}-${Date.now()}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  // 같은 엔티티에 대한 중복 작업 제거 (최신 것만 유지)
  const filteredItems = queue.items.filter(
    (i) => !(i.entityType === item.entityType && i.entityId === item.entityId)
  );

  return {
    ...queue,
    items: [...filteredItems, newItem],
  };
}

/**
 * 큐에서 아이템 제거 (동기화 성공 시)
 */
export function removeFromSyncQueue(
  queue: SyncQueue,
  itemId: string
): SyncQueue {
  return {
    ...queue,
    items: queue.items.filter((i) => i.id !== itemId),
  };
}

/**
 * 재시도 카운트 증가 (동기화 실패 시)
 */
export function incrementRetryCount(
  queue: SyncQueue,
  itemId: string,
  error: string
): SyncQueue {
  return {
    ...queue,
    items: queue.items.map((i) =>
      i.id === itemId
        ? { ...i, retryCount: i.retryCount + 1, lastError: error }
        : i
    ),
  };
}

/**
 * 재시도 횟수 초과한 아이템 제거
 */
export function removeFailedItems(queue: SyncQueue, maxRetries: number = 3): SyncQueue {
  return {
    ...queue,
    items: queue.items.filter((i) => i.retryCount < maxRetries),
  };
}

/**
 * 마지막 동기화 시간 업데이트
 */
export function updateLastSyncTime(queue: SyncQueue): SyncQueue {
  return {
    ...queue,
    lastSyncTime: Date.now(),
  };
}

/**
 * 동기화 상태 업데이트
 */
export function updateSyncStatus(
  queue: SyncQueue,
  status: SyncQueue["syncStatus"]
): SyncQueue {
  return {
    ...queue,
    syncStatus: status,
  };
}

/**
 * 현재 동기화 큐 반환
 * API 서비스에서 사용 (useSyncStore의 간단한 wrapper)
 */
export function getSyncQueue(): SyncQueue {
  return loadSyncQueue();
}

/**
 * Sync Manager - IndexedDB ↔ Backend 동기화 관리자
 *
 * 핵심 원리:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 변경사항을 동기화 큐에 추가
 * 3. 백그라운드에서 큐를 처리하여 Backend와 동기화
 * 4. 충돌 해결 전략: Last-Write-Wins (최신 timestamp 우선)
 */

import { useSyncStore } from "./sync-store";
import type { SyncQueueItem } from "./sync-queue";
import { getAuthHeaders } from "@/lib/auth/token-manager";

/**
 * Backend API 엔드포인트
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Backend에 단일 아이템 동기화
 */
async function syncItemToBackend(item: SyncQueueItem): Promise<void> {
  const { entityType, entityId, operation, data } = item;

  // API 엔드포인트 생성
  let url = `${API_BASE_URL}/api/${entityType}s`;
  if (operation === "update" || operation === "delete") {
    url += `/${entityId}`;
  }

  // HTTP 메서드 결정
  const method = {
    create: "POST",
    update: "PATCH",
    delete: "DELETE",
  }[operation];

  // 인증 헤더 가져오기
  const authHeaders = await getAuthHeaders();

  // API 호출
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    ...(operation !== "delete" && { body: JSON.stringify(data) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Backend sync failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
}

/**
 * 동기화 큐 처리 (하나씩 순차 처리)
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
}> {
  const syncStore = useSyncStore.getState();

  // 이미 동기화 중이거나 큐가 비어있으면 건너뜀
  if (syncStore.isSyncing || syncStore.queue.items.length === 0) {
    return { success: 0, failed: 0 };
  }

  syncStore.startSync();
  syncStore.setSyncError(null); // 동기화 시작 시 에러 초기화

  let successCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  // 큐의 각 아이템을 순차 처리
  for (const item of syncStore.queue.items) {
    try {
      await syncItemToBackend(item);
      syncStore.removeFromQueue(item.id);
      successCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to sync item ${item.id}:`, errorMessage);

      // 마지막 에러 저장
      lastError = errorMessage;

      // 재시도 카운트 증가
      syncStore.markItemFailed(item.id, errorMessage);
      failedCount++;

      // 재시도 횟수 초과 시 큐에서 제거
      if (item.retryCount >= 2) {
        console.warn(`Item ${item.id} exceeded retry limit, removing from queue`);
        syncStore.removeFromQueue(item.id);
      }
    }
  }

  // 동기화 완료 처리
  const success = failedCount === 0;
  syncStore.finishSync(success);

  if (success) {
    // 성공 시 마지막 동기화 시간 업데이트
    syncStore.setLastSyncTime(Date.now());
    syncStore.setSyncError(null);
  } else {
    // 실패 시 에러 메시지 저장
    syncStore.setSyncError(lastError || "동기화 중 오류가 발생했습니다");
  }

  return { success: successCount, failed: failedCount };
}

/**
 * 수동 동기화 (사용자가 명시적으로 요청)
 */
export async function syncNow(): Promise<void> {
  console.log("Manual sync initiated");
  await processSyncQueue();
}

/**
 * 자동 동기화 시작 (주기적으로 큐 처리)
 */
let syncIntervalId: NodeJS.Timeout | null = null;

export function startAutoSync(interval: number = 5000): void {
  if (syncIntervalId) {
    console.warn("Auto sync already running");
    return;
  }

  console.log(`Auto sync started (interval: ${interval}ms)`);

  syncIntervalId = setInterval(async () => {
    const syncStore = useSyncStore.getState();
    if (!syncStore.autoSyncEnabled) return;

    await processSyncQueue();
  }, interval);
}

/**
 * 자동 동기화 중지
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log("Auto sync stopped");
  }
}

/**
 * Backend에서 데이터 풀 (Full sync)
 * - 앱 시작 시 또는 오랜 시간 오프라인 후 사용
 */
export async function pullFromBackend(): Promise<void> {
  try {
    // TODO: Backend에서 모든 데이터 가져오기
    // const response = await fetch(`${API_BASE_URL}/api/sync/full`);
    // const data = await response.json();

    // TODO: IndexedDB에 덮어쓰기 (conflict resolution 필요)

    console.log("Pull from backend completed");
  } catch (error) {
    console.error("Failed to pull from backend:", error);
    throw error;
  }
}

/**
 * Conflict Resolution: Last-Write-Wins 전략
 * - IndexedDB와 Backend의 timestamp를 비교
 * - 더 최신 것을 선택
 */
export function resolveConflict(
  localItem: { updatedAt: number; [key: string]: any },
  remoteItem: { updatedAt: number; [key: string]: any }
): { source: "local" | "remote"; item: any } {
  if (localItem.updatedAt > remoteItem.updatedAt) {
    return { source: "local", item: localItem };
  } else {
    return { source: "remote", item: remoteItem };
  }
}

/**
 * Sync Manager - IndexedDB ↔ Backend 동기화 관리자
 *
 * 핵심 원리:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 변경사항을 동기화 큐에 추가
 * 3. 백그라운드에서 큐를 처리하여 Backend와 동기화
 * 4. 충돌 해결 전략: Last-Write-Wins (최신 timestamp 우선)
 * 5. HTTP Client V2 사용 (retry, timeout, cache, interceptors 등)
 */

import { useSyncStore } from "./sync-store";
import type { SyncQueueItem } from "./sync-queue";
import { apiClient, API_BASE_URL } from "@/lib/api/client";
import { getFileById } from "@/lib/db/files";
import { getAccessToken } from "@/lib/auth/token-manager";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SyncManager");

/**
 * Backend에 단일 아이템 동기화 (HTTP Client V2 사용)
 * - Retry: 최대 3회 시도 (exponential backoff)
 * - Timeout: 30초
 * - Request interceptor에서 Authorization 헤더 자동 주입
 */
async function syncItemToBackend(item: SyncQueueItem): Promise<void> {
  const { entityType, entityId, operation, data } = item;

  // 지원하지 않는 작업 타입은 스킵
  if (!["create", "update", "delete"].includes(operation)) {
    log.debug(`Skipping unsupported operation: ${operation}`);
    return;
  }

  // API 엔드포인트 생성 (entityType별 특별 처리)
  let endpoint = "";

  switch (entityType) {
    case "noteContent":
      // POST /notes/:noteId/content/:pageId
      if (operation === "update" || operation === "create") {
        const noteId = data?.note_id;
        const pageId = data?.page_id;
        if (!noteId || !pageId) {
          throw new Error("noteContent requires note_id and page_id in data");
        }
        endpoint = `/notes/${noteId}/content/${pageId}`;
      } else {
        throw new Error(`noteContent does not support ${operation} operation`);
      }
      break;

    case "file":
      if (operation === "create") {
        // POST /notes/:noteId/files - FormData로 파일 업로드
        const noteId = data?.note_id;
        if (!noteId) {
          throw new Error("file create requires note_id in data");
        }

        // IndexedDB에서 파일 조회
        const dbFile = await getFileById(entityId);
        if (!dbFile) {
          throw new Error(`File not found in IndexedDB: ${entityId}`);
        }

        // 이미 백엔드 URL이 있으면 스킵 (이미 동기화됨)
        if (dbFile.backendUrl) {
          log.debug(`File already synced to backend: ${entityId}`);
          return; // 성공으로 처리
        }

        // FormData 생성하여 파일 업로드
        const formData = new FormData();
        const file = new File([dbFile.fileData], dbFile.fileName, { type: dbFile.fileType });
        formData.append("file", file);

        const token = getAccessToken();

        const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files`, {
          method: "POST",
          body: formData,
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`File upload failed: ${response.status} - ${errorText}`);
        }

        const uploadResult = await response.json();

        // IndexedDB에 백엔드 URL 및 백엔드 ID 업데이트
        const { updateFileBackendInfo } = await import("@/lib/db/files");
        await updateFileBackendInfo(entityId, uploadResult.storageUrl, uploadResult.id);

        log.info(`✅ File uploaded to backend: ${dbFile.fileName}, backendId: ${uploadResult.id}`);
        return; // 성공으로 처리 (apiClient 호출 건너뜀)
      } else if (operation === "delete") {
        // DELETE /api/files/:backendId - 백엔드 ID로 삭제
        // data.backend_id가 있으면 백엔드에서 삭제, 없으면 스킵 (로컬에서만 삭제됨)
        const backendId = data?.backend_id;
        if (!backendId) {
          log.debug(`File not synced to backend, skipping delete API call: ${entityId}`);
          return; // 백엔드에 없는 파일은 스킵
        }
        endpoint = `/api/files/${backendId}`;
      } else {
        throw new Error(`file does not support ${operation} operation`);
      }
      break;

    case "recording":
      if (operation === "create") {
        // POST /notes/:noteId/recordings
        const noteId = data?.noteId || data?.note_id;
        if (!noteId) {
          throw new Error("recording create requires noteId in data");
        }
        endpoint = `/notes/${noteId}/recordings`;
      } else if (operation === "delete") {
        // DELETE /recordings/:id
        endpoint = `/recordings/${entityId}`;
      } else if (operation === "update") {
        // PATCH /recordings/:id
        endpoint = `/recordings/${entityId}`;
      }
      break;

    case "note":
      // 기본 CRUD: /notes, /notes/:id
      endpoint = operation === "create" ? `/notes` : `/notes/${entityId}`;
      break;

    case "folder":
      // 기본 CRUD: /folders, /folders/:id
      endpoint = operation === "create" ? `/folders` : `/folders/${entityId}`;
      break;

    case "trash":
      // 휴지통 관련
      if (operation === "delete") {
        endpoint = `/trash/${entityId}`;
      } else {
        endpoint = `/trash/${operation}/${entityId}`;
      }
      break;

    default:
      throw new Error(`Unsupported entityType: ${entityType}`);
  }

  // HTTP 메서드 결정
  const methods: Record<"create" | "update" | "delete", string> = {
    create: "POST",
    update: "PATCH",
    delete: "DELETE",
  };
  const method = methods[operation as "create" | "update" | "delete"];

  try {
    // HTTP Client V2 사용: retry, timeout, cache, interceptors 자동 지원
    await apiClient<any>(endpoint, {
      method,
      ...(operation !== "delete" && { body: JSON.stringify(data) }),
    }, {
      retries: 3,
      timeout: 30000,
      cache: false, // 동기화 요청은 캐싱 금지
      skipInterceptors: false, // Request interceptor로 Authorization 헤더 자동 주입
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Backend sync failed: ${errorMessage}`);
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
      log.error(`Failed to sync item ${item.id}:`, errorMessage);

      // 마지막 에러 저장
      lastError = errorMessage;

      // 재시도 카운트 증가
      syncStore.markItemFailed(item.id, errorMessage);
      failedCount++;

      // 재시도 횟수 초과 시 큐에서 제거
      if (item.retryCount >= 2) {
        log.warn(`Item ${item.id} exceeded retry limit, removing from queue`);
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
  log.info("Manual sync initiated");
  await processSyncQueue();
}

/**
 * 자동 동기화 시작 (주기적으로 큐 처리)
 */
let syncIntervalId: NodeJS.Timeout | null = null;

export function startAutoSync(interval: number = 5000): void {
  if (syncIntervalId) {
    log.warn("Auto sync already running");
    return;
  }

  log.info(`Auto sync started (interval: ${interval}ms)`);

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
    log.info("Auto sync stopped");
  }
}

/**
 * Backend에서 데이터 풀 (Full sync)
 * - 앱 시작 시 또는 오랜 시간 오프라인 후 사용
 */
export async function pullFromBackend(): Promise<void> {
  try {
    log.info("Starting full pull from backend...");

    // 백엔드에서 모든 데이터 가져오기
    const [notes, folders, files, recordings] = await Promise.all([
      apiClient<any[]>("/api/notes", { method: "GET" }).catch(() => []),
      apiClient<any[]>("/api/folders", { method: "GET" }).catch(() => []),
      apiClient<any[]>("/api/files", { method: "GET" }).catch(() => []),
      apiClient<any[]>("/api/recordings", { method: "GET" }).catch(() => []),
    ]);

    log.info(`Fetched ${notes.length} notes, ${folders.length} folders, ${files.length} files, ${recordings.length} recordings`);

    // IndexedDB에 저장 (conflict resolution 적용)
    const { initDB } = await import("@/lib/db/index");
    const db = await initDB();

    // 트랜잭션으로 한 번에 처리
    const transaction = db.transaction(
      ["notes", "folders", "files", "recordings"],
      "readwrite"
    );

    const notesStore = transaction.objectStore("notes");
    const foldersStore = transaction.objectStore("folders");
    const filesStore = transaction.objectStore("files");
    const recordingsStore = transaction.objectStore("recordings");

    // 각 엔티티 병합 (Last-Write-Wins 전략)
    for (const note of notes) {
      const existingNote = await new Promise<any>((resolve) => {
        const req = notesStore.get(note.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (!existingNote || note.updatedAt > existingNote.updatedAt) {
        await new Promise<void>((resolve, reject) => {
          const req = notesStore.put(note);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }

    for (const folder of folders) {
      const existingFolder = await new Promise<any>((resolve) => {
        const req = foldersStore.get(folder.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (!existingFolder || folder.updatedAt > existingFolder.updatedAt) {
        await new Promise<void>((resolve, reject) => {
          const req = foldersStore.put(folder);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }

    for (const file of files) {
      const existingFile = await new Promise<any>((resolve) => {
        const req = filesStore.get(file.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (!existingFile || file.updatedAt > existingFile.updatedAt) {
        await new Promise<void>((resolve, reject) => {
          const req = filesStore.put(file);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }

    for (const recording of recordings) {
      const existingRecording = await new Promise<any>((resolve) => {
        const req = recordingsStore.get(recording.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (!existingRecording || recording.updatedAt > existingRecording.updatedAt) {
        await new Promise<void>((resolve, reject) => {
          const req = recordingsStore.put(recording);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    log.info("Pull from backend completed successfully");
  } catch (error) {
    log.error("Failed to pull from backend:", error);
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

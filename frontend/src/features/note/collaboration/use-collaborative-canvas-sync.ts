/**
 * 실시간 캔버스 동기화 훅
 *
 * Liveblocks Storage를 사용한 실시간 캔버스 동기화
 * pdf-drawing-overlay.tsx와 함께 사용하여 실시간 협업 기능 추가
 *
 * ⭐ v2 아키텍처: IndexedDB가 Single Source of Truth
 * - Educator 저장: Canvas → IndexedDB → Liveblocks broadcast
 * - Student 수신: Liveblocks receive → IndexedDB 저장 → onRemoteUpdate 콜백
 * - Canvas 로드는 use-drawing-page-data.ts가 IndexedDB에서 담당
 *
 * 주요 기능:
 * - Promise 기반 완료 처리
 * - 재시도 로직 (최대 3회)
 * - 오프라인 복구 지원 (연결 복구 시 pending 변경사항 동기화)
 * - 에러 상태 관리 및 콜백 제공
 * - readOnly 모드 (학생용 읽기 전용)
 */

import { useEffect, useRef, useCallback, useState } from "react";
import {
  useStorage,
  useMutation,
  useStatus,
} from "@/lib/liveblocks/liveblocks.config";
import { getCanvasKey } from "@/lib/liveblocks/liveblocks.config";
import { saveDrawing } from "@/lib/db/drawings";
import { createLogger } from "@/lib/utils/logger";
import type * as fabric from "fabric";
import type { DrawingData } from "@/lib/types/drawing";

const log = createLogger("useCollaborativeCanvasSync");

/** 동기화 설정 상수 */
const SYNC_CONFIG = {
  DEBOUNCE_MS: 500, // 동기화 디바운스 시간
  MAX_RETRIES: 3, // 최대 재시도 횟수
  RETRY_DELAY_MS: 1000, // 재시도 간격
  RENDER_STABILIZE_MS: 50, // 렌더링 안정화 대기 시간
} as const;

export interface UseCollaborativeCanvasSyncProps {
  noteId: string;  // ⭐ IndexedDB 저장에 필요
  fileId: string;
  pageNum: number;
  fabricCanvas: fabric.Canvas | null;
  isEnabled: boolean;
  /** 읽기 전용 모드 (학생용) */
  readOnly?: boolean;
  /** 동기화 에러 콜백 */
  onSyncError?: (error: Error) => void;
  /** 연결 상태 변경 콜백 */
  onConnectionChange?: (status: string) => void;
  /** ⭐ 원격 업데이트 수신 콜백 - IndexedDB 저장 후 호출되어 Canvas 재로드 트리거 */
  onRemoteUpdate?: () => void;
}

interface SyncState {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: Error | null;
  retryCount: number;
}

export interface UseCollaborativeCanvasSyncReturn {
  syncToStorage: (canvas: fabric.Canvas) => void;
  retryPendingChanges: () => void;
  clearError: () => void;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  lastSyncedAt: number | null;
  hasPendingChanges: boolean;
  connectionStatus: string;
}

/**
 * Liveblocks Storage와 Fabric.js 캔버스를 동기화하는 훅
 *
 * ⭐ v2: IndexedDB가 Single Source of Truth
 * - Educator: Canvas → Liveblocks broadcast (IndexedDB 저장은 use-drawing-page-data에서)
 * - Student: Liveblocks receive → IndexedDB 저장 → onRemoteUpdate 콜백
 */
export function useCollaborativeCanvasSync({
  noteId,
  fileId,
  pageNum,
  fabricCanvas,
  isEnabled,
  readOnly = false,
  onSyncError,
  onConnectionChange,
  onRemoteUpdate,
}: UseCollaborativeCanvasSyncProps): UseCollaborativeCanvasSyncReturn {
  const canvasKey = getCanvasKey(fileId, pageNum);
  const isUpdatingFromStorage = useRef(false); // 무한 루프 방지
  const pendingChanges = useRef<object | null>(null); // 오프라인 동안 쌓인 변경사항

  // 동기화 상태 관리
  const [syncState, setSyncState] = useState<SyncState>({
    isLoading: true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    retryCount: 0,
  });

  // Liveblocks 연결 상태 모니터링
  const connectionStatus = useStatus();
  const prevConnectionStatus = useRef(connectionStatus);

  // Liveblocks Storage에서 전체 캔버스 데이터 가져오기
  const allCanvasData = useStorage((root) => root.canvasData || null);

  // 현재 페이지의 캔버스 데이터 (canvasKey로 접근)
  const canvasDataFromStorage = allCanvasData?.[canvasKey] || null;

  // ⭐ 디버깅: canvasKey와 Storage 상태 확인
  useEffect(() => {
    log.debug("⭐ 캔버스 동기화 상태:", {
      canvasKey,
      fileId,
      pageNum,
      isEnabled,
      readOnly,
      hasAllCanvasData: !!allCanvasData,
      allCanvasKeys: allCanvasData ? Object.keys(allCanvasData) : [],
      hasMatchingData: !!canvasDataFromStorage,
      matchingDataObjects: (canvasDataFromStorage as any)?.objects?.length || 0,
    });
  }, [canvasKey, fileId, pageNum, isEnabled, readOnly, allCanvasData, canvasDataFromStorage]);

  // Storage에 캔버스 데이터 저장 (Mutation)
  const updateCanvasInStorage = useMutation(
    ({ storage }, canvasJSON: object) => {
      let canvasData = storage.get("canvasData");

      // canvasData가 없으면 초기화
      if (!canvasData) {
        storage.set("canvasData", {});
        canvasData = storage.get("canvasData");
      }

      // 타입 체크
      if (canvasData && typeof canvasData === "object") {
        (canvasData as Record<string, object>)[canvasKey] = canvasJSON;
      }
    },
    [canvasKey]
  );

  // 마지막으로 Storage에 저장된 JSON (중복 저장 방지)
  const lastSavedJSON = useRef<string | null>(null);
  // 마지막으로 로드한 canvasKey 추적 (페이지별 로드 보장)
  const lastLoadedKeyRef = useRef<string | null>(null);

  // 연결 상태 변경 감지 및 오프라인 복구
  useEffect(() => {
    const wasDisconnected = prevConnectionStatus.current !== "connected";
    const isNowConnected = connectionStatus === "connected";

    // 연결 상태 변경 콜백
    if (prevConnectionStatus.current !== connectionStatus) {
      onConnectionChange?.(connectionStatus);
      prevConnectionStatus.current = connectionStatus;
    }

    // 오프라인 → 온라인 복구 (readOnly 모드에서는 스킵)
    if (
      !readOnly &&
      wasDisconnected &&
      isNowConnected &&
      pendingChanges.current
    ) {
      log.debug("연결 복구 - pending 변경사항 동기화");

      // pending 변경사항 전송
      try {
        updateCanvasInStorage(pendingChanges.current);
        pendingChanges.current = null;
        setSyncState((prev) => ({
          ...prev,
          lastSyncedAt: Date.now(),
          error: null,
        }));
      } catch (error) {
        log.error("복구 동기화 실패:", error);
      }
    }
  }, [connectionStatus, updateCanvasInStorage, onConnectionChange, readOnly]);

  // ⭐ 참고: 초기 드로잉 동기화는 useSyncNoteToLiveblocks에서 일괄 처리
  // 여기서는 실시간 변경사항만 처리

  // 재시도 로직이 포함된 Storage 업데이트
  const syncToStorageWithRetry = useCallback(
    async (canvasJSON: object, retryCount = 0): Promise<boolean> => {
      try {
        // 오프라인이면 pending에 저장
        if (connectionStatus !== "connected") {
          log.debug("오프라인 - 변경사항 보관");
          pendingChanges.current = canvasJSON;
          return false;
        }

        updateCanvasInStorage(canvasJSON);

        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: Date.now(),
          error: null,
          retryCount: 0,
        }));

        return true;
      } catch (error) {
        const syncError =
          error instanceof Error ? error : new Error("동기화 실패");

        if (retryCount < SYNC_CONFIG.MAX_RETRIES) {
          log.warn(
            `동기화 실패, 재시도 ${retryCount + 1}/${SYNC_CONFIG.MAX_RETRIES}`
          );

          setSyncState((prev) => ({
            ...prev,
            retryCount: retryCount + 1,
          }));

          // 재시도 딜레이 후 다시 시도
          await new Promise((resolve) =>
            setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY_MS)
          );
          return syncToStorageWithRetry(canvasJSON, retryCount + 1);
        }

        // 최대 재시도 초과
        log.error("최대 재시도 횟수 초과:", syncError);
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          error: syncError,
          retryCount: 0,
        }));

        onSyncError?.(syncError);

        // 실패한 변경사항 보관 (나중에 재시도 가능)
        pendingChanges.current = canvasJSON;

        return false;
      }
    },
    [connectionStatus, updateCanvasInStorage, onSyncError]
  );

  // 로컬 캔버스 → Storage로 동기화 (readOnly 모드에서는 비활성화)
  const syncToStorage = useCallback(
    (canvas: fabric.Canvas) => {
      log.debug("syncToStorage 호출됨:", {
        isEnabled,
        hasCanvas: !!canvas,
        isUpdating: isUpdatingFromStorage.current,
        readOnly,
      });

      if (!isEnabled || !canvas || isUpdatingFromStorage.current || readOnly) {
        log.debug("syncToStorage 스킵 - 조건 불충족");
        return;
      }

      try {
        // 캔버스 JSON 변환
        const canvasJSON = canvas.toJSON();
        const jsonString = JSON.stringify(canvasJSON);
        const objectCount = canvasJSON.objects?.length || 0;

        log.debug("캔버스 JSON 생성됨:", { objectCount });

        // 이전에 저장한 것과 같으면 스킵 (중복 저장 방지)
        if (lastSavedJSON.current === jsonString) {
          log.debug("중복 데이터 - 스킵");
          return;
        }

        lastSavedJSON.current = jsonString;

        log.debug("Storage에 저장 중:", { canvasKey });
        setSyncState((prev) => ({ ...prev, isSyncing: true }));
        syncToStorageWithRetry(canvasJSON);
      } catch (error) {
        log.error("JSON 변환 실패:", error);
        const syncError =
          error instanceof Error ? error : new Error("JSON 변환 실패");
        setSyncState((prev) => ({ ...prev, error: syncError }));
        onSyncError?.(syncError);
      }
    },
    [isEnabled, syncToStorageWithRetry, onSyncError, readOnly, canvasKey]
  );

  /**
   * ⭐ v2: Liveblocks 데이터를 IndexedDB에 저장 (Canvas 직접 로드 X)
   * Canvas 로드는 use-drawing-page-data.ts가 담당
   */
  const saveToIndexedDB = useCallback(
    async (
      canvasData: { version?: string; objects?: any[]; background?: string },
      retryCount = 0
    ): Promise<boolean> => {
      try {
        isUpdatingFromStorage.current = true;

        // IndexedDB에 저장할 DrawingData 구성
        const drawingData: DrawingData = {
          id: `${noteId}-${fileId}-${pageNum}`,
          noteId,
          fileId,
          pageNum,
          canvas: {
            version: canvasData.version || "6.0.0",
            objects: canvasData.objects || [],
            background: canvasData.background || "transparent",
            width: fabricCanvas?.width || 0,
            height: fabricCanvas?.height || 0,
          },
          image: "",  // ⭐ 원격 수신 시 이미지는 생략 (용량 최적화)
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await saveDrawing(drawingData);
        log.debug("Liveblocks 데이터 → IndexedDB 저장 완료:", canvasKey);

        // ⭐ onRemoteUpdate 콜백 호출 → use-drawing-page-data가 IndexedDB에서 로드
        isUpdatingFromStorage.current = false;
        onRemoteUpdate?.();

        setSyncState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));

        return true;
      } catch (error) {
        const saveError =
          error instanceof Error ? error : new Error("IndexedDB 저장 실패");

        if (retryCount < SYNC_CONFIG.MAX_RETRIES) {
          log.warn(
            `IndexedDB 저장 실패, 재시도 ${retryCount + 1}/${SYNC_CONFIG.MAX_RETRIES}`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY_MS)
          );
          return saveToIndexedDB(canvasData, retryCount + 1);
        }

        // 최대 재시도 초과
        log.error("IndexedDB 저장 최종 실패:", saveError);
        isUpdatingFromStorage.current = false;

        setSyncState((prev) => ({
          ...prev,
          isLoading: false,
          error: saveError,
        }));

        onSyncError?.(saveError);
        return false;
      }
    },
    [noteId, fileId, pageNum, canvasKey, fabricCanvas, onSyncError, onRemoteUpdate]
  );

  /**
   * ⭐ v2: Liveblocks Storage 변경 감지 → IndexedDB 저장 → onRemoteUpdate 콜백
   * Canvas 로드는 use-drawing-page-data.ts가 IndexedDB에서 담당
   */
  useEffect(() => {
    if (!isEnabled) {
      log.debug("Liveblocks 수신 스킵 - 비활성화");
      return;
    }

    // 페이지가 변경되었는지 확인
    const isPageChanged = lastLoadedKeyRef.current !== canvasKey;

    if (isPageChanged) {
      log.debug("페이지 변경 감지:", { canvasKey });

      // 캐시 리셋 (Canvas 클리어는 use-drawing-page-data에서 처리)
      lastSavedJSON.current = null;
      lastLoadedKeyRef.current = canvasKey;

      setSyncState((prev) => ({ ...prev, isLoading: true }));

      // ⭐ Liveblocks에 데이터가 있으면 IndexedDB에 저장
      if (canvasDataFromStorage) {
        const objectCount = (canvasDataFromStorage as any).objects?.length || 0;
        log.debug("⭐ Liveblocks 초기 데이터 수신:", {
          canvasKey,
          objectCount,
          readOnly,
          hasData: !!canvasDataFromStorage,
        });
        const storageJSON = JSON.stringify(canvasDataFromStorage);
        lastSavedJSON.current = storageJSON;
        saveToIndexedDB(canvasDataFromStorage);
      } else {
        log.debug("Liveblocks Storage에 데이터 없음:", { canvasKey, readOnly });
        setSyncState((prev) => ({ ...prev, isLoading: false }));
      }
      return;
    }

    // 페이지 전환이 아닌 경우: 다른 사용자의 변경사항 동기화
    if (isUpdatingFromStorage.current) {
      log.debug("IndexedDB 업데이트 중 - 스킵");
      return;
    }

    if (!canvasDataFromStorage) {
      return;
    }

    // 실제로 데이터가 변경되었는지 확인 (불필요한 저장 방지)
    const storageJSON = JSON.stringify(canvasDataFromStorage);
    if (lastSavedJSON.current === storageJSON) {
      // 이미 같은 데이터 - 스킵
      return;
    }

    // ⭐ 실시간 동기화: Liveblocks 변경 → IndexedDB 저장 → onRemoteUpdate
    const objectCount = (canvasDataFromStorage as any).objects?.length || 0;
    log.debug("⭐ 실시간 동기화 수신:", {
      canvasKey,
      objectCount,
      readOnly,
    });
    lastSavedJSON.current = storageJSON;
    saveToIndexedDB(canvasDataFromStorage);
  }, [
    canvasDataFromStorage,
    isEnabled,
    canvasKey,
    saveToIndexedDB,
    readOnly,
  ]);

  // Fabric.js 이벤트 리스너: 캔버스 변경 감지 (readOnly가 아닐 때만)
  useEffect(() => {
    // readOnly 모드에서는 이벤트 리스너 등록 안함 (쓰기 권한 없음)
    if (!fabricCanvas || !isEnabled || readOnly) {
      log.debug("이벤트 리스너 스킵:", {
        hasFabricCanvas: !!fabricCanvas,
        isEnabled,
        readOnly,
      });
      return;
    }

    log.debug("이벤트 리스너 등록됨:", { canvasKey });

    let debounceTimer: NodeJS.Timeout | null = null;

    const handleCanvasModified = () => {
      log.debug("캔버스 변경 감지");

      // Storage에서 업데이트 중이면 무시 (무한 루프 방지)
      if (isUpdatingFromStorage.current) {
        log.debug("Storage 업데이트 중 - 스킵");
        return;
      }

      // 디바운스
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        log.debug("Storage로 동기화 시작");
        syncToStorage(fabricCanvas);
      }, SYNC_CONFIG.DEBOUNCE_MS);
    };

    // Fabric.js 이벤트 리스너 등록
    fabricCanvas.on("object:added", handleCanvasModified);
    fabricCanvas.on("object:modified", handleCanvasModified);
    fabricCanvas.on("object:removed", handleCanvasModified);
    fabricCanvas.on("path:created", handleCanvasModified); // 펜 그리기

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      fabricCanvas.off("object:added", handleCanvasModified);
      fabricCanvas.off("object:modified", handleCanvasModified);
      fabricCanvas.off("object:removed", handleCanvasModified);
      fabricCanvas.off("path:created", handleCanvasModified);
    };
  }, [fabricCanvas, isEnabled, readOnly, syncToStorage, canvasKey]);

  // pending 변경사항 수동 재시도
  const retryPendingChanges = useCallback(() => {
    if (pendingChanges.current && connectionStatus === "connected") {
      syncToStorageWithRetry(pendingChanges.current).then((success) => {
        if (success) {
          pendingChanges.current = null;
        }
      });
    }
  }, [connectionStatus, syncToStorageWithRetry]);

  // 에러 상태 초기화
  const clearError = useCallback(() => {
    setSyncState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    syncToStorage,
    retryPendingChanges,
    clearError,
    // 상태 정보
    isLoading: syncState.isLoading,
    isSyncing: syncState.isSyncing,
    error: syncState.error,
    lastSyncedAt: syncState.lastSyncedAt,
    hasPendingChanges: pendingChanges.current !== null,
    connectionStatus,
  };
}

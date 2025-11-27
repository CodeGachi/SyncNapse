/**
 * Collaborative Canvas Sync
 *
 * Liveblocks Storage를 사용한 실시간 캔버스 동기화 래퍼
 * pdf-drawing-overlay.tsx와 함께 사용하여 실시간 협업 기능 추가
 *
 * Phase 1 개선사항:
 * - 600ms 하드코딩 제거 → Promise 기반 완료 처리
 * - 재시도 로직 추가 (최대 3회)
 * - 오프라인 복구 지원 (연결 복구 시 pending 변경사항 동기화)
 * - 에러 상태 관리 및 콜백 제공
 * - readOnly 모드 추가 (학생용 읽기 전용)
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  useStorage,
  useMutation,
  useStatus,
} from "@/lib/liveblocks/liveblocks.config";
import { getCanvasKey } from "@/lib/liveblocks/liveblocks.config";
import type * as fabric from "fabric";

// 설정 상수
const SYNC_CONFIG = {
  DEBOUNCE_MS: 500,           // 동기화 디바운스 시간
  MAX_RETRIES: 3,             // 최대 재시도 횟수
  RETRY_DELAY_MS: 1000,       // 재시도 간격
  RENDER_STABILIZE_MS: 50,    // 렌더링 안정화 대기 시간
} as const;

interface CollaborativeCanvasSyncProps {
  fileId: string;
  pageNum: number;
  fabricCanvas: fabric.Canvas | null;
  isEnabled: boolean;
  readOnly?: boolean;                        // 읽기 전용 모드 (학생용)
  onSyncError?: (error: Error) => void;      // 동기화 에러 콜백
  onConnectionChange?: (status: string) => void;  // 연결 상태 변경 콜백
}

interface SyncState {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: Error | null;
  retryCount: number;
}

/**
 * Liveblocks Storage와 Fabric.js 캔버스를 동기화하는 훅
 */
export function useCollaborativeCanvasSync({
  fileId,
  pageNum,
  fabricCanvas,
  isEnabled,
  readOnly = false,
  onSyncError,
  onConnectionChange,
}: CollaborativeCanvasSyncProps) {
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
    if (!readOnly && wasDisconnected && isNowConnected && pendingChanges.current) {
      console.log("[Collaborative Canvas] 연결 복구 - pending 변경사항 동기화");

      // pending 변경사항 전송
      try {
        updateCanvasInStorage(pendingChanges.current);
        pendingChanges.current = null;
        setSyncState(prev => ({
          ...prev,
          lastSyncedAt: Date.now(),
          error: null,
        }));
      } catch (error) {
        console.error("[Collaborative Canvas] 복구 동기화 실패:", error);
      }
    }
  }, [connectionStatus, updateCanvasInStorage, onConnectionChange, readOnly]);

  // 재시도 로직이 포함된 Storage 업데이트
  const syncToStorageWithRetry = useCallback(
    async (canvasJSON: object, retryCount = 0): Promise<boolean> => {
      try {
        // 오프라인이면 pending에 저장
        if (connectionStatus !== "connected") {
          console.log("[Collaborative Canvas] 오프라인 - 변경사항 보관");
          pendingChanges.current = canvasJSON;
          return false;
        }

        updateCanvasInStorage(canvasJSON);

        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: Date.now(),
          error: null,
          retryCount: 0,
        }));

        return true;
      } catch (error) {
        const syncError = error instanceof Error ? error : new Error("동기화 실패");

        if (retryCount < SYNC_CONFIG.MAX_RETRIES) {
          console.warn(
            `[Collaborative Canvas] 동기화 실패, 재시도 ${retryCount + 1}/${SYNC_CONFIG.MAX_RETRIES}`
          );

          setSyncState(prev => ({
            ...prev,
            retryCount: retryCount + 1,
          }));

          // 재시도 딜레이 후 다시 시도
          await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY_MS));
          return syncToStorageWithRetry(canvasJSON, retryCount + 1);
        }

        // 최대 재시도 초과
        console.error("[Collaborative Canvas] 최대 재시도 횟수 초과:", syncError);
        setSyncState(prev => ({
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
      console.log("[Collaborative Canvas] syncToStorage 호출됨", { isEnabled, canvas: !!canvas, isUpdating: isUpdatingFromStorage.current, readOnly });

      if (!isEnabled || !canvas || isUpdatingFromStorage.current || readOnly) {
        console.log("[Collaborative Canvas] syncToStorage 스킵 - 조건 불충족");
        return;
      }

      try {
        // 캔버스 JSON 변환
        const canvasJSON = canvas.toJSON();
        const jsonString = JSON.stringify(canvasJSON);
        const objectCount = canvasJSON.objects?.length || 0;

        console.log("[Collaborative Canvas] 캔버스 JSON 생성됨, 객체 수:", objectCount);

        // 이전에 저장한 것과 같으면 스킵 (중복 저장 방지)
        if (lastSavedJSON.current === jsonString) {
          console.log("[Collaborative Canvas] 중복 데이터 - 스킵");
          return;
        }

        lastSavedJSON.current = jsonString;

        console.log("[Collaborative Canvas] 💾 Storage에 저장 중... canvasKey:", canvasKey);
        setSyncState(prev => ({ ...prev, isSyncing: true }));
        syncToStorageWithRetry(canvasJSON);
      } catch (error) {
        console.error("[Collaborative Canvas] JSON 변환 실패:", error);
        const syncError = error instanceof Error ? error : new Error("JSON 변환 실패");
        setSyncState(prev => ({ ...prev, error: syncError }));
        onSyncError?.(syncError);
      }
    },
    [isEnabled, syncToStorageWithRetry, onSyncError, readOnly, canvasKey]
  );

  // Storage에서 캔버스 로드 (Promise 기반, 재시도 포함)
  const loadFromStorage = useCallback(
    async (
      canvas: fabric.Canvas,
      data: object,
      retryCount = 0
    ): Promise<boolean> => {
      try {
        isUpdatingFromStorage.current = true;

        // Fabric.js v6: loadFromJSON은 Promise 반환
        await canvas.loadFromJSON(data);

        // 렌더링 안정화 대기
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            canvas.renderAll();
            // 짧은 안정화 시간 후 플래그 해제
            setTimeout(() => {
              isUpdatingFromStorage.current = false;
              resolve();
            }, SYNC_CONFIG.RENDER_STABILIZE_MS);
          });
        });

        setSyncState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));

        return true;
      } catch (error) {
        const loadError = error instanceof Error ? error : new Error("캔버스 로드 실패");

        if (retryCount < SYNC_CONFIG.MAX_RETRIES) {
          console.warn(
            `[Collaborative Canvas] 로드 실패, 재시도 ${retryCount + 1}/${SYNC_CONFIG.MAX_RETRIES}`
          );

          await new Promise(resolve => setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY_MS));
          return loadFromStorage(canvas, data, retryCount + 1);
        }

        // 최대 재시도 초과
        console.error("[Collaborative Canvas] 캔버스 로드 최종 실패:", loadError);
        isUpdatingFromStorage.current = false;

        setSyncState(prev => ({
          ...prev,
          isLoading: false,
          error: loadError,
        }));

        onSyncError?.(loadError);
        return false;
      }
    },
    [onSyncError]
  );

  // Storage → 로컬 캔버스로 동기화 (실시간 수신)
  useEffect(() => {
    if (!isEnabled || !fabricCanvas) {
      console.log("[Collaborative Canvas] ⏸️ 동기화 스킵 - isEnabled:", isEnabled, "fabricCanvas:", !!fabricCanvas);
      return;
    }

    // 페이지가 변경되었는지 확인
    const isPageChanged = lastLoadedKeyRef.current !== canvasKey;

    if (isPageChanged) {
      console.log("[Collaborative Canvas] 📄 페이지 변경 감지:", canvasKey);

      // 캔버스 클리어 (이전 페이지 내용 제거)
      fabricCanvas.clear();
      fabricCanvas.renderAll();

      // 캐시 리셋
      lastSavedJSON.current = null;
      lastLoadedKeyRef.current = canvasKey;

      setSyncState(prev => ({ ...prev, isLoading: true }));

      // 데이터가 있으면 바로 로드
      if (canvasDataFromStorage) {
        console.log("[Collaborative Canvas] ✅ Storage에서 초기 데이터 로드");
        const storageJSON = JSON.stringify(canvasDataFromStorage);
        lastSavedJSON.current = storageJSON;
        loadFromStorage(fabricCanvas, canvasDataFromStorage);
      } else {
        console.log("[Collaborative Canvas] ℹ️ Storage에 데이터 없음");
        setSyncState(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    // 페이지 전환이 아닌 경우: 다른 사용자의 변경사항 동기화
    if (isUpdatingFromStorage.current) {
      console.log("[Collaborative Canvas] ⏳ 업데이트 중 - 스킵");
      return;
    }

    if (!canvasDataFromStorage) {
      return;
    }

    // 실제로 데이터가 변경되었는지 확인 (불필요한 로드 방지)
    const storageJSON = JSON.stringify(canvasDataFromStorage);
    if (lastSavedJSON.current === storageJSON) {
      // 이미 같은 데이터 - 스킵
      return;
    }

    // 🔥 실시간 동기화: 다른 사용자가 그린 내용 수신
    console.log("[Collaborative Canvas] 🔥 실시간 동기화 수신! readOnly:", readOnly);
    lastSavedJSON.current = storageJSON;
    loadFromStorage(fabricCanvas, canvasDataFromStorage);
  }, [canvasDataFromStorage, fabricCanvas, isEnabled, canvasKey, loadFromStorage, readOnly]);

  // Fabric.js 이벤트 리스너: 캔버스 변경 감지 (readOnly가 아닐 때만)
  useEffect(() => {
    // readOnly 모드에서는 이벤트 리스너 등록 안함 (쓰기 권한 없음)
    if (!fabricCanvas || !isEnabled || readOnly) {
      console.log("[Collaborative Canvas] 🚫 이벤트 리스너 스킵:", { fabricCanvas: !!fabricCanvas, isEnabled, readOnly });
      return;
    }

    console.log("[Collaborative Canvas] ✅ 이벤트 리스너 등록됨 - canvasKey:", canvasKey);

    let debounceTimer: NodeJS.Timeout | null = null;

    const handleCanvasModified = () => {
      console.log("[Collaborative Canvas] 🎨 캔버스 변경 감지!");

      // Storage에서 업데이트 중이면 무시 (무한 루프 방지)
      if (isUpdatingFromStorage.current) {
        console.log("[Collaborative Canvas] ⏭️ Storage 업데이트 중 - 스킵");
        return;
      }

      // 디바운스
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        console.log("[Collaborative Canvas] 📤 Storage로 동기화 시작...");
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
  }, [fabricCanvas, isEnabled, readOnly, syncToStorage]);

  // pending 변경사항 수동 재시도
  const retryPendingChanges = useCallback(() => {
    if (pendingChanges.current && connectionStatus === "connected") {
      syncToStorageWithRetry(pendingChanges.current).then(success => {
        if (success) {
          pendingChanges.current = null;
        }
      });
    }
  }, [connectionStatus, syncToStorageWithRetry]);

  // 에러 상태 초기화
  const clearError = useCallback(() => {
    setSyncState(prev => ({ ...prev, error: null }));
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

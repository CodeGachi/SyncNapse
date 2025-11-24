/**
 * Collaborative Canvas Sync
 *
 * Liveblocks Storage를 사용한 실시간 캔버스 동기화 래퍼
 * pdf-drawing-overlay.tsx와 함께 사용하여 실시간 협업 기능 추가
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  useStorage,
  useMutation,
} from "@/lib/liveblocks/liveblocks.config";
import { getCanvasKey } from "@/lib/liveblocks/liveblocks.config";
import type * as fabric from "fabric";

interface CollaborativeCanvasSyncProps {
  fileId: string;
  pageNum: number;
  fabricCanvas: fabric.Canvas | null;
  isEnabled: boolean;
}

/**
 * Liveblocks Storage와 Fabric.js 캔버스를 동기화하는 훅
 */
export function useCollaborativeCanvasSync({
  fileId,
  pageNum,
  fabricCanvas,
  isEnabled,
}: CollaborativeCanvasSyncProps) {
  const canvasKey = getCanvasKey(fileId, pageNum);
  const isUpdatingFromStorage = useRef(false); // 무한 루프 방지

  // Liveblocks Storage에서 전체 캔버스 데이터 가져오기 (canvasKey 변경에도 안정적으로 동작)
  const allCanvasData = useStorage((root) => root.canvasData || null);

  // 현재 페이지의 캔버스 데이터 (canvasKey로 접근)
  const canvasDataFromStorage = allCanvasData?.[canvasKey] || null;

  // Storage에 캔버스 데이터 저장 (Mutation)
  const updateCanvasInStorage = useMutation(
    ({ storage }, canvasJSON: any) => {
      let canvasData = storage.get("canvasData");

      // canvasData가 없으면 초기화
      if (!canvasData) {
        storage.set("canvasData", {});
        canvasData = storage.get("canvasData");
      }

      // 타입 체크
      if (canvasData && typeof canvasData === "object") {
        (canvasData as any)[canvasKey] = canvasJSON;
      }

      console.log("[Collaborative Canvas] Storage 업데이트:", canvasKey);
    },
    [canvasKey]
  );

  // 마지막으로 Storage에 저장된 JSON (중복 저장 방지)
  const lastSavedJSON = useRef<string | null>(null);
  // 마지막으로 로드한 canvasKey 추적 (페이지별 로드 보장)
  const lastLoadedKeyRef = useRef<string | null>(null);

  // 로컬 캔버스 → Storage로 동기화 (디바운스)
  const syncToStorage = useCallback(
    (canvas: fabric.Canvas) => {
      if (!isEnabled || !canvas || isUpdatingFromStorage.current) return;

      try {
        // 캔버스 JSON 변환
        const canvasJSON = canvas.toJSON();
        const jsonString = JSON.stringify(canvasJSON);

        // 이전에 저장한 것과 같으면 스킵 (중복 저장 방지)
        if (lastSavedJSON.current === jsonString) {
          return;
        }

        lastSavedJSON.current = jsonString;
        updateCanvasInStorage(canvasJSON);
        console.log("[Collaborative Canvas] 로컬 → Storage 동기화");
      } catch (error) {
        console.error("[Collaborative Canvas] Storage 동기화 실패:", error);
      }
    },
    [isEnabled, updateCanvasInStorage]
  );

  // Storage → 로컬 캔버스로 동기화
  useEffect(() => {
    if (!isEnabled || !fabricCanvas) {
      return;
    }

    // 페이지가 변경되었는지 확인
    const isPageChanged = lastLoadedKeyRef.current !== canvasKey;

    console.log("[Collaborative Canvas] 🔍 Sync check - canvasKey:", canvasKey,
      "isPageChanged:", isPageChanged,
      "hasData:", !!canvasDataFromStorage,
      "isUpdating:", isUpdatingFromStorage.current);

    if (isPageChanged) {
      console.log("[Collaborative Canvas] 📄 페이지 전환 감지:", lastLoadedKeyRef.current, "→", canvasKey);

      // 캔버스 클리어 (이전 페이지 내용 제거)
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      console.log("[Collaborative Canvas] 🧹 캔버스 클리어 완료");

      // 캐시 리셋
      lastSavedJSON.current = null;
      lastLoadedKeyRef.current = canvasKey;

      // 데이터가 있으면 바로 로드
      if (canvasDataFromStorage) {
        console.log("[Collaborative Canvas] ✅ 새 페이지 데이터 발견, 즉시 로드");
        isUpdatingFromStorage.current = true;
        const storageJSON = JSON.stringify(canvasDataFromStorage);
        lastSavedJSON.current = storageJSON;

        // Fabric.js v6: loadFromJSON은 Promise 반환
        fabricCanvas.loadFromJSON(canvasDataFromStorage).then(() => {
          // 렌더링 보장을 위해 requestAnimationFrame 사용
          requestAnimationFrame(() => {
            fabricCanvas.renderAll();
            console.log("[Collaborative Canvas] ✅ 페이지 전환 후 로드 완료, canvasKey:", canvasKey, "objects:", fabricCanvas.getObjects().length);
            setTimeout(() => {
              isUpdatingFromStorage.current = false;
            }, 600);
          });
        }).catch((error) => {
          console.error("[Collaborative Canvas] 로드 실패:", error);
          isUpdatingFromStorage.current = false;
        });
      } else {
        console.log("[Collaborative Canvas] ℹ️ 새 페이지에 데이터 없음 (빈 페이지)");
      }
      return;
    }

    // 페이지 전환이 아닌 경우: 다른 사용자의 변경사항 동기화
    if (isUpdatingFromStorage.current) {
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

    console.log("[Collaborative Canvas] Storage → 로컬 동기화 시작 (외부 변경), canvasKey:", canvasKey);
    isUpdatingFromStorage.current = true;
    lastSavedJSON.current = storageJSON;

    // Fabric.js v6: loadFromJSON은 Promise 반환
    fabricCanvas.loadFromJSON(canvasDataFromStorage).then(() => {
      requestAnimationFrame(() => {
        fabricCanvas.renderAll();
        console.log("[Collaborative Canvas] Storage → 로컬 동기화 완료, canvasKey:", canvasKey, "objects:", fabricCanvas.getObjects().length);
        setTimeout(() => {
          isUpdatingFromStorage.current = false;
        }, 600);
      });
    }).catch((error) => {
      console.error("[Collaborative Canvas] 로컬 동기화 실패:", error);
      isUpdatingFromStorage.current = false;
    })
  }, [canvasDataFromStorage, fabricCanvas, isEnabled, canvasKey]);

  // Fabric.js 이벤트 리스너: 캔버스 변경 감지
  useEffect(() => {
    if (!fabricCanvas || !isEnabled) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const handleCanvasModified = () => {
      // Storage에서 업데이트 중이면 무시 (무한 루프 방지)
      if (isUpdatingFromStorage.current) return;

      // 디바운스 (500ms)
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        syncToStorage(fabricCanvas);
      }, 500);
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
  }, [fabricCanvas, isEnabled, syncToStorage]);

  return {
    syncToStorage,
    isLoading: !canvasDataFromStorage && isEnabled,
  };
}

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

  // Liveblocks Storage에서 캔버스 데이터 가져오기
  const canvasDataFromStorage = useStorage(
    (root) => root.canvasData?.[canvasKey] || null
  );

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

  // 로컬 캔버스 → Storage로 동기화 (디바운스)
  const syncToStorage = useCallback(
    (canvas: fabric.Canvas) => {
      if (!isEnabled || !canvas || isUpdatingFromStorage.current) return;

      try {
        const canvasJSON = canvas.toJSON();
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
    if (
      !isEnabled ||
      !fabricCanvas ||
      !canvasDataFromStorage ||
      isUpdatingFromStorage.current
    ) {
      return;
    }

    console.log("[Collaborative Canvas] Storage → 로컬 동기화 시작");
    isUpdatingFromStorage.current = true;

    try {
      // Storage의 캔버스 데이터를 로컬 캔버스에 로드
      fabricCanvas.loadFromJSON(canvasDataFromStorage, () => {
        fabricCanvas.renderAll();
        console.log("[Collaborative Canvas] Storage → 로컬 동기화 완료");

        // 짧은 딜레이 후 플래그 해제 (다음 변경 감지 가능하도록)
        setTimeout(() => {
          isUpdatingFromStorage.current = false;
        }, 100);
      });
    } catch (error) {
      console.error("[Collaborative Canvas] 로컬 동기화 실패:", error);
      isUpdatingFromStorage.current = false;
    }
  }, [canvasDataFromStorage, fabricCanvas, isEnabled]);

  // Fabric.js 이벤트 리스너: 캔버스 변경 감지
  useEffect(() => {
    if (!fabricCanvas || !isEnabled) return;

    const handleCanvasModified = () => {
      // 디바운스 (300ms)
      if (syncToStorage) {
        const timer = setTimeout(() => {
          syncToStorage(fabricCanvas);
        }, 300);

        return () => clearTimeout(timer);
      }
    };

    // Fabric.js 이벤트 리스너 등록
    fabricCanvas.on("object:added", handleCanvasModified);
    fabricCanvas.on("object:modified", handleCanvasModified);
    fabricCanvas.on("object:removed", handleCanvasModified);
    fabricCanvas.on("path:created", handleCanvasModified); // 펜 그리기

    return () => {
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

/**
 * 드로잉 페이지 데이터 관리 훅
 *
 * IndexedDB에서 페이지별 드로잉 데이터 로드/저장
 * 페이지 전환 시 캔버스 상태 관리
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { getDrawing } from "@/lib/db/drawings";
import type { DrawingData } from "@/lib/types/drawing";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useDrawingPageData");

export interface UseDrawingPageDataProps {
  fabricCanvas: fabric.Canvas | null;
  noteId: string;
  fileId: string;
  pageNum: number;
  /** 협업 모드 여부 (협업 모드에서는 Liveblocks가 처리) */
  isCollaborative: boolean;
  /** 저장 콜백 */
  onSave?: (data: DrawingData) => Promise<void>;
  /** Liveblocks 동기화 함수 */
  syncToStorage?: (canvas: fabric.Canvas) => void;
}

export interface UseDrawingPageDataReturn {
  /** 로딩 상태 */
  isLoading: boolean;
  /** 자동 저장 트리거 */
  triggerAutoSave: () => void;
  /** Undo/Redo 스택 초기화 콜백 (페이지 전환 시 호출) */
  resetUndoStack: () => void;
}

/**
 * 드로잉 페이지 데이터 로드/저장 훅
 */
export function useDrawingPageData({
  fabricCanvas,
  noteId,
  fileId,
  pageNum,
  isCollaborative,
  onSave,
  syncToStorage,
}: UseDrawingPageDataProps): UseDrawingPageDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 페이지 전환 추적
  const prevPageNumRef = useRef<number>(pageNum);
  const isInitialMountRef = useRef<boolean>(true);
  const hasLoadedRef = useRef<boolean>(false);
  const [shouldLoadContent, setShouldLoadContent] = useState<boolean>(true);

  // Undo 스택 초기화 콜백 (외부에서 주입받음)
  const resetUndoStackCallbackRef = useRef<(() => void) | null>(null);

  const resetUndoStack = useCallback(() => {
    resetUndoStackCallbackRef.current?.();
  }, []);

  // 페이지 전환 감지
  useEffect(() => {
    // 초기 마운트 시 스킵
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPageNumRef.current = pageNum;
      log.debug("초기 마운트, 페이지:", pageNum);
      return;
    }

    // 실제 페이지 변경 시에만 트리거
    if (prevPageNumRef.current !== pageNum) {
      log.debug("페이지 변경:", prevPageNumRef.current, "->", pageNum);
      prevPageNumRef.current = pageNum;

      // Undo/Redo 스택 초기화
      resetUndoStack();

      // 비협업 모드에서만 캔버스 클리어 및 IndexedDB 로드
      if (!isCollaborative && fabricCanvas) {
        try {
          const lowerCanvas = (fabricCanvas as any).lowerCanvasEl;
          if (lowerCanvas && lowerCanvas.getContext && lowerCanvas.isConnected !== false) {
            const ctx = lowerCanvas.getContext("2d");
            if (ctx) {
              fabricCanvas.clear();
              fabricCanvas.renderAll();
              log.debug("페이지 변경으로 캔버스 클리어 (비협업 모드)");
            }
          }
        } catch (e) {
          log.warn("캔버스 클리어 스킵 - 컨텍스트 사용 불가");
        }
        hasLoadedRef.current = false;
        setShouldLoadContent(true);
      }
    }
  }, [pageNum, isCollaborative, fabricCanvas, resetUndoStack]);

  // 페이지 데이터 로드
  useEffect(() => {
    if (!fabricCanvas || !noteId || !fileId) return;
    if (isCollaborative) return;
    if (!shouldLoadContent || hasLoadedRef.current) return;

    const loadPageData = async () => {
      log.debug(`페이지 ${pageNum} 데이터 로드 중...`);
      setIsLoading(true);

      try {
        const drawingData = await getDrawing(noteId, fileId, pageNum);

        if (drawingData?.canvas) {
          log.debug(`페이지 ${pageNum} 데이터 발견, 로드 중...`);

          fabricCanvas.loadFromJSON(drawingData.canvas, () => {
            fabricCanvas.renderAll();
            log.debug(`페이지 ${pageNum} 데이터 로드 완료`);
          });
        } else {
          log.debug(`페이지 ${pageNum}에 저장된 데이터 없음`);
        }

        hasLoadedRef.current = true;
        setShouldLoadContent(false);
      } catch (error) {
        log.error(`페이지 ${pageNum} 로드 실패:`, error);
        setShouldLoadContent(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [shouldLoadContent, pageNum, noteId, fileId, isCollaborative, fabricCanvas]);

  // 자동 저장 (디바운스)
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!fabricCanvas) return;

      try {
        const canvasJSON = fabricCanvas.toJSON();

        // Liveblocks 협업 동기화
        if (isCollaborative && syncToStorage) {
          syncToStorage(fabricCanvas);
        }

        // IndexedDB 로컬 저장
        if (onSave) {
          const imageData = fabricCanvas.toDataURL({ format: "png", multiplier: 1 });

          const data: DrawingData = {
            id: `${noteId}-${fileId}-${pageNum}`,
            noteId,
            fileId,
            pageNum,
            canvas: canvasJSON,
            image: imageData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await onSave(data);
        }
      } catch (error) {
        log.error("드로잉 자동 저장 실패:", error);
      }
    }, 1000);
  }, [fabricCanvas, onSave, noteId, fileId, pageNum, isCollaborative, syncToStorage]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    triggerAutoSave,
    resetUndoStack,
  };
}

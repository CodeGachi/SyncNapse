/**
 * 드로잉 페이지 데이터 관리 훅
 *
 * IndexedDB에서 페이지별 드로잉 데이터 로드/저장
 * 페이지 전환 시 캔버스 상태 관리
 *
 * ⚠️ 중요: 로드 완료 전/실패 시 저장을 차단하여 기존 데이터 보호
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { getDrawing } from "@/lib/db/drawings";
import type { DrawingData } from "@/lib/types/drawing";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useDrawingPageData");

/** 로드 재시도 설정 */
const LOAD_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export interface UseDrawingPageDataProps {
  /** Fabric.js Canvas 참조 (ref로 전달하여 항상 최신 값 사용) */
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  noteId: string;
  pageNum: number;
  /** 협업 모드 여부 (협업 모드에서는 Liveblocks가 처리) */
  isCollaborative: boolean;
  /** 캔버스 준비 완료 여부 */
  isCanvasReady: boolean;
  /** 저장 콜백 */
  onSave?: (data: DrawingData) => Promise<void>;
  /** Liveblocks 동기화 함수 (ref로 전달하여 항상 최신 값 사용) */
  syncToStorageRef?: React.MutableRefObject<((canvas: fabric.Canvas) => void) | null>;
  /** ⭐ v2: 원격 업데이트 수신 시 재로드 트리거 (Liveblocks → IndexedDB 저장 후 호출됨) */
  remoteUpdateTrigger?: number;
}

export interface UseDrawingPageDataReturn {
  /** 로딩 상태 */
  isLoading: boolean;
  /** 로드 성공 여부 (저장 가능 여부 판단용) */
  isLoadSuccess: boolean;
  /** 자동 저장 트리거 */
  triggerAutoSave: () => void;
  /** Undo/Redo 스택 초기화 콜백 (페이지 전환 시 호출) */
  resetUndoStack: () => void;
}

/**
 * 드로잉 페이지 데이터 로드/저장 훅
 */
export function useDrawingPageData({
  fabricCanvasRef,
  noteId,
  pageNum,
  isCollaborative,
  isCanvasReady,
  onSave,
  syncToStorageRef,
  remoteUpdateTrigger,
}: UseDrawingPageDataProps): UseDrawingPageDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadSuccess, setIsLoadSuccess] = useState(false);  // ⭐ 로드 성공 여부
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 페이지 전환 추적
  const prevPageNumRef = useRef<number>(pageNum);
  const isInitialMountRef = useRef<boolean>(true);
  const hasLoadedRef = useRef<boolean>(false);
  const [shouldLoadContent, setShouldLoadContent] = useState<boolean>(true);

  // 로드 재시도 카운트
  const retryCountRef = useRef<number>(0);

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
      const fabricCanvas = fabricCanvasRef.current;
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
        setIsLoadSuccess(false);  // ⭐ 페이지 전환 시 로드 성공 상태 초기화
        retryCountRef.current = 0;  // 재시도 카운트 초기화
        setShouldLoadContent(true);
      }
    }
  }, [pageNum, isCollaborative, fabricCanvasRef, resetUndoStack]);

  // 페이지 데이터 로드 (IndexedDB) - 재시도 로직 포함
  // 협업 모드에서도 IndexedDB를 백업으로 사용 (Liveblocks Storage가 비어있을 때 대비)
  // 비협업 모드에서는 항상 IndexedDB에서 로드
  // ⚠️ 중요: 로드 실패 시 저장을 차단하여 기존 데이터 보호
  useEffect(() => {
    // 캔버스가 준비되지 않았으면 대기
    if (!isCanvasReady) {
      log.debug("페이지 로드 대기 - 캔버스 미준비");
      return;
    }

    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas || !noteId) {
      log.debug("페이지 로드 스킵 - 캔버스 또는 ID 없음:", { hasCanvas: !!fabricCanvas, noteId });
      return;
    }
    if (!shouldLoadContent || hasLoadedRef.current) {
      log.debug("페이지 로드 스킵 - 이미 로드됨:", { shouldLoadContent, hasLoaded: hasLoadedRef.current });
      return;
    }

    const loadPageData = async (): Promise<boolean> => {
      log.debug(`페이지 ${pageNum} 데이터 로드 중... (협업모드: ${isCollaborative}, 시도: ${retryCountRef.current + 1}/${LOAD_CONFIG.MAX_RETRIES})`);
      setIsLoading(true);

      try {
        const drawingData = await getDrawing(noteId, pageNum);

        if (drawingData?.canvas) {
          log.debug(`페이지 ${pageNum} IndexedDB 데이터 발견, 로드 중... 오브젝트 수:`, drawingData.canvas.objects?.length || 0);

          // 협업 모드에서는 Liveblocks가 이후에 덮어쓸 수 있음
          // 하지만 IndexedDB 백업을 먼저 로드하여 빠른 초기 렌더링 제공
          await fabricCanvas.loadFromJSON(drawingData.canvas);
          fabricCanvas.renderAll();
          log.debug(`페이지 ${pageNum} IndexedDB 데이터 로드 완료`);
        } else {
          log.debug(`페이지 ${pageNum}에 IndexedDB 저장된 데이터 없음 - 새 페이지로 간주`);
        }

        // ⭐ 로드 성공
        hasLoadedRef.current = true;
        setIsLoadSuccess(true);
        setShouldLoadContent(false);
        retryCountRef.current = 0;
        return true;
      } catch (error) {
        log.error(`페이지 ${pageNum} 로드 실패 (시도 ${retryCountRef.current + 1}/${LOAD_CONFIG.MAX_RETRIES}):`, error);

        // ⭐ 재시도 로직
        retryCountRef.current += 1;
        if (retryCountRef.current < LOAD_CONFIG.MAX_RETRIES) {
          log.debug(`페이지 ${pageNum} 로드 재시도 예약 (${LOAD_CONFIG.RETRY_DELAY_MS}ms 후)`);
          await new Promise(resolve => setTimeout(resolve, LOAD_CONFIG.RETRY_DELAY_MS));
          return loadPageData();  // 재귀 호출로 재시도
        }

        // ⭐ 최대 재시도 초과 - 로드 실패 상태 유지 (저장 차단됨)
        log.error(`페이지 ${pageNum} 로드 최종 실패 - 저장이 차단됩니다. 기존 데이터 보호를 위해 새로고침을 권장합니다.`);
        setIsLoadSuccess(false);
        setShouldLoadContent(false);  // 더 이상 로드 시도 안함
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [isCanvasReady, shouldLoadContent, pageNum, noteId, isCollaborative, fabricCanvasRef]);

  /**
   * ⭐ v2: 원격 업데이트 수신 시 IndexedDB에서 재로드
   * Liveblocks가 데이터를 IndexedDB에 저장한 후 remoteUpdateTrigger를 변경하면
   * 이 effect가 실행되어 Canvas를 업데이트함
   */
  useEffect(() => {
    // remoteUpdateTrigger가 없거나 0이면 스킵 (초기 상태)
    if (!remoteUpdateTrigger || remoteUpdateTrigger === 0) {
      return;
    }

    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas || !noteId || !isCanvasReady) {
      log.debug("원격 업데이트 재로드 스킵 - 조건 불충족");
      return;
    }

    const reloadFromIndexedDB = async () => {
      log.debug(`원격 업데이트 수신 → IndexedDB에서 재로드 (페이지 ${pageNum})`);

      try {
        const drawingData = await getDrawing(noteId, pageNum);

        if (drawingData?.canvas) {
          log.debug(`원격 데이터 로드 중... 오브젝트 수:`, drawingData.canvas.objects?.length || 0);

          await fabricCanvas.loadFromJSON(drawingData.canvas);
          fabricCanvas.renderAll();

          log.debug(`원격 데이터 로드 완료`);
        } else {
          log.debug(`원격 업데이트: IndexedDB에 데이터 없음 (새 페이지)`);
        }
      } catch (error) {
        log.error("원격 업데이트 재로드 실패:", error);
      }
    };

    reloadFromIndexedDB();
  }, [remoteUpdateTrigger, fabricCanvasRef, noteId, pageNum, isCanvasReady]);

  // 자동 저장 (디바운스)
  // 주의: fabricCanvasRef와 syncToStorageRef를 사용하여 항상 최신 값 참조
  // ⚠️ 중요: 로드 완료 전/실패 시 저장을 차단하여 기존 데이터 보호
  const triggerAutoSave = useCallback(() => {
    // ⭐ 로드 성공하지 않았으면 저장 차단
    if (!isLoadSuccess) {
      log.warn("triggerAutoSave: 로드가 완료되지 않아 저장을 차단합니다. 기존 데이터 보호.");
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      // ⭐ 타이머 실행 시점에도 다시 체크 (페이지 전환 등으로 상태 변경 가능)
      if (!isLoadSuccess) {
        log.warn("triggerAutoSave (타이머): 로드가 완료되지 않아 저장을 차단합니다.");
        return;
      }

      const fabricCanvas = fabricCanvasRef.current;
      if (!fabricCanvas) {
        log.warn("triggerAutoSave: fabricCanvas가 null입니다");
        return;
      }

      try {
        const rawJSON = fabricCanvas.toJSON();
        // DrawingData.canvas 타입에 맞게 필수 필드 추가
        const canvasJSON = {
          ...rawJSON,
          version: rawJSON.version || "6.0.0",
          objects: rawJSON.objects || [],
          background: rawJSON.background || "transparent",
          width: fabricCanvas.width || 0,
          height: fabricCanvas.height || 0,
        };
        log.debug("triggerAutoSave: 캔버스 JSON 생성됨, 오브젝트 수:", canvasJSON.objects?.length || 0);

        // Liveblocks 협업 동기화
        const syncToStorage = syncToStorageRef?.current;
        if (isCollaborative && syncToStorage) {
          log.debug("triggerAutoSave: Liveblocks 동기화 시작");
          syncToStorage(fabricCanvas);
        }

        // IndexedDB 로컬 저장 - 협업/비협업 모두 저장
        if (onSave) {
          const imageData = fabricCanvas.toDataURL({ format: "png", multiplier: 1 });

          const data: DrawingData = {
            id: `${noteId}-${pageNum}`,
            noteId,
            pageNum,
            canvas: canvasJSON,
            image: imageData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await onSave(data);
          log.debug("triggerAutoSave: IndexedDB 저장 완료, ID:", data.id);
        } else {
          log.warn("triggerAutoSave: onSave 콜백이 없어 IndexedDB 저장 스킵");
        }
      } catch (error) {
        log.error("드로잉 자동 저장 실패:", error);
      }
    }, 1000);
  }, [fabricCanvasRef, onSave, noteId, pageNum, isCollaborative, syncToStorageRef, isLoadSuccess]);

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
    isLoadSuccess,
    triggerAutoSave,
    resetUndoStack,
  };
}

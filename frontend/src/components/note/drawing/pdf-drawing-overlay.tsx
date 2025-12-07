/**
 * PDF Drawing Overlay
 *
 * PDF 뷰어 위에 그리기 기능을 제공하는 캔버스 오버레이
 * Fabric.js 캔버스 초기화 및 렌더링만 담당 (비즈니스 로직은 훅에서 처리)
 *
 * ⚠️ 중요: 로드 완료 전/실패 시 그리기를 차단하여 기존 데이터 보호
 */

"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as fabric from "fabric";
import type { DrawingData } from "@/lib/types/drawing";
import { CollaborativeCanvasWrapper } from "./collaborative-canvas-wrapper";
import {
  useDrawingPageData,
  useDrawingTools,
  useCanvasUndoRedo,
} from "@/features/note/drawing";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("PDFDrawingOverlay");

export interface PDFDrawingOverlayHandle {
  handleUndo: () => void;
  handleRedo: () => void;
  handleClear: () => void;
}

interface PDFDrawingOverlayProps {
  isEnabled: boolean;
  isDrawingMode: boolean;
  noteId: string;
  fileId: string;
  pageNum: number;
  containerWidth: number;
  containerHeight: number;
  pdfScale: number;
  renderedWidth?: number;
  renderedHeight?: number;
  isPdf?: boolean;
  onSave?: (data: DrawingData) => Promise<void>;
  isCollaborative?: boolean;
  isSharedView?: boolean;
}

export const PDFDrawingOverlay = forwardRef<
  PDFDrawingOverlayHandle,
  PDFDrawingOverlayProps
>(
  (
    {
      isEnabled,
      isDrawingMode,
      noteId,
      fileId,
      pageNum,
      containerWidth: _containerWidth,
      containerHeight: _containerHeight,
      pdfScale,
      renderedWidth,
      renderedHeight,
      isPdf,
      onSave,
      isCollaborative = false,
      isSharedView = false,
    },
    ref
  ) => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const syncToStorageRef = useRef<((canvas: fabric.Canvas) => void) | null>(null);

    // State
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
    const currentCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);
    const initialCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);

    // ⭐ v2: 원격 업데이트 트리거 (Liveblocks → IndexedDB 저장 후 증가)
    const [remoteUpdateTrigger, setRemoteUpdateTrigger] = useState(0);

    // ⭐ v2: 원격 업데이트 수신 콜백 (Liveblocks가 IndexedDB에 저장 후 호출)
    const handleRemoteUpdate = useCallback(() => {
      setRemoteUpdateTrigger((prev) => prev + 1);
    }, []);

    // 페이지 데이터 로드/저장 훅
    // ref를 전달하여 항상 최신 값을 참조하도록 함
    // isCanvasReady가 true일 때만 IndexedDB에서 로드
    // ⚠️ isLoadSuccess: 로드 성공 여부 - 실패 시 그리기/저장 차단
    const { triggerAutoSave, isLoadSuccess, isLoading } = useDrawingPageData({
      fabricCanvasRef,
      noteId,
      fileId,
      pageNum,
      isCollaborative,
      isCanvasReady,
      onSave,
      syncToStorageRef,
      remoteUpdateTrigger,  // ⭐ v2: 원격 업데이트 시 재로드 트리거
    });

    // ⭐ 실제 그리기 가능 여부: 로드 성공 + 로딩 완료
    const canDraw = isLoadSuccess && !isLoading;

    // 디버깅 로그
    useEffect(() => {
      log.debug("상태 변경:", {
        isCanvasReady,
        isLoadSuccess,
        isLoading,
        canDraw,
        isCollaborative,
        renderedWidth,
        renderedHeight,
        hasFabricCanvas: !!fabricCanvasRef.current,
      });
    }, [isCanvasReady, isLoadSuccess, isLoading, canDraw, isCollaborative, renderedWidth, renderedHeight]);

    // Undo/Redo에 triggerAutoSave 연결
    // ref를 전달하여 항상 최신 캔버스 참조
    const undoRedoWithSave = useCanvasUndoRedo({
      fabricCanvasRef,
      onAutoSave: triggerAutoSave,
    });

    // 드로잉 도구 이벤트 훅
    // ref를 전달하여 항상 최신 캔버스 참조
    // ⭐ 로드 완료 전까지 그리기 비활성화
    useDrawingTools({
      fabricCanvasRef,
      isDrawingMode: isDrawingMode && canDraw,  // ⭐ 로드 완료 시에만 그리기 활성화
      isEnabled: isEnabled && canDraw,           // ⭐ 로드 완료 시에만 활성화
      pdfScale,
      undoStackRef: undoRedoWithSave.undoStackRef,
      onAutoSave: triggerAutoSave,
    });

    // 렌더링 크기 ref (의존성 문제 해결용)
    const renderedSizeRef = useRef<{ width: number; height: number } | null>(null);

    // renderedWidth/Height가 설정될 때 ref 업데이트
    useEffect(() => {
      if (renderedWidth && renderedHeight) {
        renderedSizeRef.current = { width: renderedWidth, height: renderedHeight };
      }
    }, [renderedWidth, renderedHeight]);

    // Canvas 초기화 트리거 (renderedWidth/Height가 설정되면 트리거)
    const [canvasInitTrigger, setCanvasInitTrigger] = useState(0);

    // renderedWidth/Height가 처음 설정될 때 초기화 트리거
    useEffect(() => {
      if (renderedWidth && renderedHeight && !fabricCanvasRef.current) {
        log.debug("캔버스 초기화 트리거 증가:", { renderedWidth, renderedHeight });
        setCanvasInitTrigger((prev) => prev + 1);
      }
    }, [renderedWidth, renderedHeight]);

    // Canvas 초기화 (최초 1회만 실행)
    // ⚠️ 중요: renderedWidth/Height를 의존성에서 제외!
    // 크기 변경 시 캔버스 재생성하면 드로잉 데이터가 사라짐
    // 크기 변경은 별도 effect에서 처리
    useEffect(() => {
      const size = renderedSizeRef.current;

      log.debug("캔버스 초기화 effect 실행:", {
        hasContainer: !!containerRef.current,
        size,
        hasFabricCanvas: !!fabricCanvasRef.current,
        canvasInitTrigger,
      });

      if (!containerRef.current) {
        log.debug("캔버스 초기화 스킵 - containerRef 없음");
        return;
      }
      if (!size) {
        log.debug("캔버스 초기화 스킵 - 크기 없음");
        return;
      }
      if (fabricCanvasRef.current) {
        log.debug("캔버스 초기화 스킵 - 이미 존재");
        return;
      }

      const container = containerRef.current;
      const finalWidth = size.width;
      const finalHeight = size.height;

      container.innerHTML = "";

      const canvasElement = document.createElement("canvas");
      canvasElement.width = finalWidth;
      canvasElement.height = finalHeight;
      container.appendChild(canvasElement);

      const canvas = new fabric.Canvas(canvasElement, {
        width: finalWidth,
        height: finalHeight,
        isDrawingMode: false,
        backgroundColor: "transparent",
      });

      fabricCanvasRef.current = canvas;
      currentCanvasSizeRef.current = { width: finalWidth, height: finalHeight };
      initialCanvasSizeRef.current = { width: finalWidth, height: finalHeight };
      setContainerSize({ width: finalWidth, height: finalHeight });
      setIsCanvasReady(true);

      return () => {
        try {
          setIsCanvasReady(false);
          if (fabricCanvasRef.current) {
            const canvasToDispose = fabricCanvasRef.current;
            fabricCanvasRef.current = null;
            currentCanvasSizeRef.current = null;
            setContainerSize(null);

            canvasToDispose.off();

            try {
              const lowerCanvas = (canvasToDispose as any).lowerCanvasEl;
              if (lowerCanvas && lowerCanvas.getContext && lowerCanvas.isConnected !== false) {
                const ctx = lowerCanvas.getContext("2d");
                if (ctx) {
                  canvasToDispose.clear();
                }
              }
            } catch {
              // clear 에러는 무시
            }

            try {
              canvasToDispose.dispose();
            } catch {
              // dispose 에러는 무시
            }
          }

          if (container) {
            container.innerHTML = "";
          }
        } catch {
          fabricCanvasRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPdf, canvasInitTrigger]);  // ⚠️ renderedWidth/Height 대신 canvasInitTrigger 사용

    // Canvas 크기 변경 처리 (줌/리사이즈)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !renderedWidth || !renderedHeight) return;

      const prevSize = currentCanvasSizeRef.current;

      if (!prevSize) {
        currentCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
        initialCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
        return;
      }

      if (prevSize.width === renderedWidth && prevSize.height === renderedHeight) return;

      const scaleX = renderedWidth / prevSize.width;
      const scaleY = renderedHeight / prevSize.height;

      canvas.setDimensions({ width: renderedWidth, height: renderedHeight });

      canvas.getObjects().forEach((obj: fabric.FabricObject) => {
        obj.scaleX = (obj.scaleX || 1) * scaleX;
        obj.scaleY = (obj.scaleY || 1) * scaleY;
        obj.left = (obj.left || 0) * scaleX;
        obj.top = (obj.top || 0) * scaleY;
        obj.setCoords();
      });

      canvas.renderAll();
      currentCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
      setContainerSize({ width: renderedWidth, height: renderedHeight });
    }, [renderedWidth, renderedHeight]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        handleUndo: undoRedoWithSave.handleUndo,
        handleRedo: undoRedoWithSave.handleRedo,
        handleClear: undoRedoWithSave.handleClear,
      }),
      [undoRedoWithSave.handleUndo, undoRedoWithSave.handleRedo, undoRedoWithSave.handleClear]
    );

    return (
      <>
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: containerSize?.width ?? renderedWidth,
            height: containerSize?.height ?? renderedHeight,
            // ⭐ 로드 완료 시에만 그리기 커서 활성화
            cursor: isEnabled && isDrawingMode && canDraw ? "crosshair" : "default",
            // 캔버스는 항상 표시하여 드로잉 데이터 유지 (협업 모드에서 다른 사용자 드로잉도 보여야 함)
            opacity: 1,
            // ⭐ 로드 완료 전/실패 시 상호작용 차단 (기존 데이터 보호)
            pointerEvents: isEnabled && isDrawingMode && canDraw ? "auto" : "none",
            zIndex: isDrawingMode ? 5 : 1,
            // 캔버스를 항상 표시 (isEnabled=false여도 드로잉 데이터는 보여야 함)
            display: "block",
          }}
        />

        {isCollaborative && isCanvasReady && fabricCanvasRef.current && (
          <CollaborativeCanvasWrapper
            fabricCanvas={fabricCanvasRef.current}
            noteId={noteId}  // ⭐ v2: IndexedDB 저장에 필요
            fileId={fileId}
            pageNum={pageNum}
            syncToStorageRef={syncToStorageRef}
            readOnly={isSharedView}
            showStatusIndicator={false}
            onRemoteUpdate={handleRemoteUpdate}  // ⭐ v2: 원격 업데이트 콜백
          />
        )}
      </>
    );
  }
);

PDFDrawingOverlay.displayName = "PDFDrawingOverlay";

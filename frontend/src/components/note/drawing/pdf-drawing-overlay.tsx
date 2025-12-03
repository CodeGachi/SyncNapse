/**
 * PDF Drawing Overlay
 *
 * PDF 뷰어 위에 그리기 기능을 제공하는 캔버스 오버레이
 * Fabric.js 캔버스 초기화 및 렌더링만 담당 (비즈니스 로직은 훅에서 처리)
 */

"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import * as fabric from "fabric";
import type { DrawingData } from "@/lib/types/drawing";
import { CollaborativeCanvasWrapper } from "./collaborative-canvas-wrapper";
import {
  useDrawingPageData,
  useDrawingTools,
  useCanvasUndoRedo,
} from "@/features/note/drawing";

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
      isSharedView: _isSharedView = false,
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

    // 페이지 데이터 로드/저장 훅
    const { triggerAutoSave } = useDrawingPageData({
      fabricCanvas: fabricCanvasRef.current,
      noteId,
      fileId,
      pageNum,
      isCollaborative,
      onSave,
      syncToStorage: syncToStorageRef.current ?? undefined,
    });

    // Undo/Redo에 triggerAutoSave 연결
    const undoRedoWithSave = useCanvasUndoRedo({
      fabricCanvas: fabricCanvasRef.current,
      onAutoSave: triggerAutoSave,
    });

    // 드로잉 도구 이벤트 훅
    useDrawingTools({
      fabricCanvas: fabricCanvasRef.current,
      isDrawingMode,
      isEnabled,
      pdfScale,
      undoStackRef: undoRedoWithSave.undoStackRef,
      onAutoSave: triggerAutoSave,
    });

    // Canvas 초기화 (최초 1회만 실행)
    useEffect(() => {
      if (!containerRef.current || !isEnabled) return;
      if (!renderedWidth || !renderedHeight) return;
      if (fabricCanvasRef.current) return;

      const container = containerRef.current;
      const finalWidth = renderedWidth;
      const finalHeight = renderedHeight;

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
    }, [containerRef, isEnabled, isPdf, renderedWidth, renderedHeight]);

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
            cursor: isEnabled && isDrawingMode ? "crosshair" : "default",
            opacity: isEnabled ? 1 : 0,
            pointerEvents: isEnabled && isDrawingMode ? "auto" : "none",
            zIndex: isDrawingMode ? 5 : 1,
            display: isEnabled ? "block" : "none",
          }}
        />

        {isCollaborative && isCanvasReady && fabricCanvasRef.current && (
          <CollaborativeCanvasWrapper
            fabricCanvas={fabricCanvasRef.current}
            fileId={fileId}
            pageNum={pageNum}
            syncToStorageRef={syncToStorageRef}
            readOnly={false}
          />
        )}
      </>
    );
  }
);

PDFDrawingOverlay.displayName = "PDFDrawingOverlay";

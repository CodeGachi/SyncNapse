/**
 * PDF Drawing Overlay - 마이그레이션: drawing-board의 PicBoard 로직을 React로 포팅
 * Canvas overlay on PDF viewer with drawing capabilities (펜 + 도형)
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
import { useDrawStore } from "@/stores/draw-store";
import { useToolsStore } from "@/stores/tools-store";
import type { DrawingData } from "@/lib/types/drawing";
import { drawShape, type DrawInfo } from "@/lib/utils/shapes";
import { useCollaborativeCanvasSync } from "./collaborative-canvas-sync";

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
  currentTool: string;
  penColor: string;
  penSize: number;
  isPdf?: boolean;
  onSave?: (data: DrawingData) => Promise<void>;
  isCollaborative?: boolean;
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
      containerWidth,
      containerHeight,
      currentTool,
      penColor,
      penSize,
      isPdf,
      onSave,
      isCollaborative = false,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

    const drawStore = useDrawStore();
    const toolsStore = useToolsStore();

    // Liveblocks 협업 동기화 훅
    const { syncToStorage } = useCollaborativeCanvasSync({
      fileId,
      pageNum,
      fabricCanvas: fabricCanvasRef.current,
      isEnabled: isCollaborative,
    });

    // Canvas 초기화 (펜과 도형 모두 지원)
    useEffect(() => {
      if (!canvasRef.current || !isEnabled) return;

      // 기존 canvas 정리
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.error("Failed to dispose previous canvas:", error);
        }
        fabricCanvasRef.current = null;
      }

      // 캔버스는 전체 높이를 사용 (PDF 뷰어와 동일한 높이)
      const adjustedHeight = Math.max(containerHeight, 100);

      // Fabric Canvas 생성
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: adjustedHeight,
        isDrawingMode: false,
        backgroundColor: 'transparent',
      });

      fabricCanvasRef.current = canvas;

      // 초기 히스토리 저장
      useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

      return () => {
        try {
          if (fabricCanvasRef.current) {
            // Fabric canvas를 안전하게 정리
            fabricCanvasRef.current.dispose();
            fabricCanvasRef.current = null;
          }
        } catch (error) {
          console.error("Canvas cleanup error:", error);
          fabricCanvasRef.current = null;
        }
      };
    }, [canvasRef, isEnabled, isPdf]);

    // Canvas 리사이징 (사이드 패널 확장/축소 시)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // 캔버스는 전체 높이를 사용 (PDF 뷰어와 동일한 높이)
      const adjustedHeight = Math.max(containerHeight, 100);

      // 캔버스 크기 조정 (재생성 아님)
      canvas.setWidth(containerWidth);
      canvas.setHeight(adjustedHeight);
      canvas.renderAll();
    }, [containerWidth, containerHeight]);

    // 펜 모드 설정 (펜/형광펜 자유 그리기)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';
      const isSelectionMode = drawStore.type === 'hand';
      const isEraserMode = drawStore.type === 'eraser';

      // 자유 그리기 모드 설정
      canvas.isDrawingMode = isFreeDrawingMode && isDrawingMode;

      // 펜 모드일 때 PencilBrush 초기화 (중요!)
      if (isFreeDrawingMode && isDrawingMode) {
        // Fabric.js 브러시 생성 및 설정
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = drawStore.lineColor;
        canvas.freeDrawingBrush.width = drawStore.lineWidth;

        // 형광펜은 투명도 설정
        if (drawStore.type === 'highlighter') {
          (canvas.freeDrawingBrush as any).globalAlpha = 0.3;
        } else {
          (canvas.freeDrawingBrush as any).globalAlpha = 1;
        }
      } else {
        // 펜 모드 비활성화 시 - 브러시 정리
        canvas.isDrawingMode = false;
      }

      // 선택 가능 여부 설정
      canvas.forEachObject((obj) => {
        if (isEraserMode) {
          // 지우개 모드: 모든 객체 선택 불가능
          obj.selectable = false;
          obj.evented = false;
        } else if (isSelectionMode) {
          // 손 아이콘 모드: 모든 객체 선택 가능
          obj.selectable = true;
          obj.evented = true;
        }
      });
    }, [drawStore.type, drawStore.lineColor, drawStore.lineWidth, isDrawingMode]);

    // 미리보기 선 렌더링
    const renderPreviewLine = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        // 새 미리보기 선 추가
        const line = new fabric.Line(
          [start.x, start.y, end.x, end.y],
          {
            stroke: drawStore.lineColor,
            strokeWidth: drawStore.lineWidth,
            selectable: false,
            evented: false,
          }
        );
        (line as any).isPreview = true;
        canvas.add(line);
        canvas.renderAll();
      },
      [drawStore.lineColor, drawStore.lineWidth]
    );

    // 미리보기 사각형 렌더링
    const renderPreviewRect = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        // 새 미리보기 사각형 추가
        const rect = new fabric.Rect({
          left: Math.min(start.x, end.x),
          top: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          fill: 'rgba(255, 255, 255, 0)',
          stroke: drawStore.lineColor,
          strokeWidth: drawStore.lineWidth,
          selectable: false,
          evented: false,
        });
        (rect as any).isPreview = true;
        canvas.add(rect);
        canvas.renderAll();
      },
      [drawStore.lineColor, drawStore.lineWidth]
    );

    // 미리보기 원 렌더링
    const renderPreviewCircle = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        // 새 미리보기 원 추가
        const radius = Math.sqrt(
          (end.x - start.x) ** 2 + (end.y - start.y) ** 2
        ) / 2;
        const circle = new fabric.Circle({
          left: start.x,
          top: start.y,
          radius,
          fill: 'rgba(255, 255, 255, 0)',
          stroke: drawStore.lineColor,
          strokeWidth: drawStore.lineWidth,
          selectable: false,
          evented: false,
        });
        (circle as any).isPreview = true;
        canvas.add(circle);
        canvas.renderAll();
      },
      [drawStore.lineColor, drawStore.lineWidth]
    );

    // Auto-save drawing data to database (debounced) - 반드시 먼저 정의
    const triggerAutoSave = useCallback(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        try {
          const canvasJSON = canvas.toJSON();

          // Liveblocks 협업 동기화 (실시간 협업용)
          if (isCollaborative) {
            syncToStorage(canvas);
          }

          // IndexedDB 로컬 저장 (영구 백업용)
          if (onSave) {
            const imageData = canvas.toDataURL({ format: "png", multiplier: 1 });

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
          console.error("Failed to auto-save drawing:", error);
        }
      }, 1000);
    }, [onSave, noteId, fileId, pageNum, isCollaborative, syncToStorage]);

    // 마우스 다운 이벤트
    const handleMouseDown = useCallback(
      (event: any) => {
        if (!isEnabled || !isDrawingMode || !fabricCanvasRef.current) return;

        // 펜/형광펜 모드는 자동으로 처리되므로 이벤트 핸들러 제외
        const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';
        if (isFreeDrawingMode) return;

        setIsDrawing(true);
        const pos = fabricCanvasRef.current.getPointer(event.e as MouseEvent);
        setStartPos(pos);

        // 히스토리 저장
        useToolsStore.getState().saveSnapshot(
          JSON.stringify(fabricCanvasRef.current.toJSON())
        );
      },
      [isEnabled, isDrawingMode, drawStore.type]
    );

    // 마우스 이동 이벤트
    const handleMouseMove = useCallback(
      (event: any) => {
        if (
          !isDrawing ||
          !isEnabled ||
          !fabricCanvasRef.current ||
          !startPos
        ) return;

        const canvas = fabricCanvasRef.current;
        const pos = canvas.getPointer(event.e as MouseEvent);

        // 도구별 미리보기 렌더링
        const toolType = drawStore.type;

        if (toolType === 'eraser') {
          // 지우개 미리보기: 지울 영역을 사각형으로 표시
          renderPreviewRect(startPos, pos);
        } else if (
          toolType === 'free' ||
          toolType === 'solidLine' ||
          toolType === 'dashedLine'
        ) {
          renderPreviewLine(startPos, pos);
        } else if (toolType === 'rect') {
          renderPreviewRect(startPos, pos);
        } else if (toolType === 'circle') {
          renderPreviewCircle(startPos, pos);
        }
      },
      [
        isDrawing,
        isEnabled,
        startPos,
        drawStore.type,
        renderPreviewLine,
        renderPreviewRect,
        renderPreviewCircle,
      ]
    );

    // 마우스 업 이벤트
    const handleMouseUp = useCallback(
      (event: any) => {
        if (!isDrawing || !fabricCanvasRef.current || !startPos) return;

        const canvas = fabricCanvasRef.current;
        const pos = canvas.getPointer(event.e as MouseEvent);

        // 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        const toolType = drawStore.type;

        // 지우개 처리: 지우개 영역에 겹치는 모든 객체 삭제
        if (toolType === 'eraser') {
          const objectsToRemove: fabric.Object[] = [];

          canvas.forEachObject((obj) => {
            // 지우개 영역과 객체의 충돌 감지
            const objBounds = obj.getBoundingRect();
            const eraserX = Math.min(startPos.x, pos.x);
            const eraserY = Math.min(startPos.y, pos.y);
            const eraserWidth = Math.abs(pos.x - startPos.x) || drawStore.lineWidth;
            const eraserHeight = Math.abs(pos.y - startPos.y) || drawStore.lineWidth;

            // 간단한 충돌 감지: 지우개 영역과 객체 바운딩박스가 겹치는지 확인
            if (
              objBounds.left < eraserX + eraserWidth &&
              objBounds.left + objBounds.width > eraserX &&
              objBounds.top < eraserY + eraserHeight &&
              objBounds.top + objBounds.height > eraserY
            ) {
              objectsToRemove.push(obj);
            }
          });

          // 겹친 객체 모두 삭제
          objectsToRemove.forEach((obj) => canvas.remove(obj));
          canvas.renderAll();

          // 히스토리 업데이트
          useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

          // 자동 저장 트리거
          triggerAutoSave();
        } else {
          // 도형 생성
          const drawInfo: DrawInfo = {
            lineColor: drawStore.lineColor,
            lineWidth: drawStore.lineWidth,
            mouseFrom: startPos,
            mouseTo: pos,
          };

          const shape = drawShape(drawInfo, toolType as any);

          if (shape) {
            canvas.add(shape);
            canvas.renderAll();

            // 히스토리 업데이트
            useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

            // 자동 저장 트리거
            triggerAutoSave();
          }
        }

        setIsDrawing(false);
        setStartPos(null);
      },
      [isDrawing, startPos, drawStore.type, drawStore.lineColor, drawStore.lineWidth, triggerAutoSave]
    );

    // Canvas 이벤트 핸들러 바인딩 (도형/지우개용, 펜 제외)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      // 펜/형광펜은 Fabric의 자동 처리를 사용하므로 이벤트 핸들러 등록 안 함
      const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';

      if (isFreeDrawingMode) {
        // 펜 모드로 전환 시 기존 이벤트 핸들러 제거
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
        return;
      }

      // 도형 모드: 이벤트 핸들러 등록
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);

      return () => {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      };
    }, [handleMouseDown, handleMouseMove, handleMouseUp, drawStore.type, isDrawingMode]);

    // Fabric.js 자유 그리기 이벤트 처리 (펜/형광펜 모드용)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      const handlePathCreated = () => {
        // 펜/형광펜으로 그린 후 자동 저장
        triggerAutoSave();
      };

      // 자유 그리기 완료 이벤트 리스너 등록
      canvas.on('path:created', handlePathCreated);

      return () => {
        canvas.off('path:created', handlePathCreated);
      };
    }, [isDrawingMode, triggerAutoSave]);

    // Update canvas dimensions on container size change
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // PDF 컨트롤 바 높이를 고려하여 조정
      const controlBarHeight = isPdf ? 56 : 0;
      const adjustedHeight = Math.max(containerHeight - controlBarHeight, 100);

      canvas.setWidth(containerWidth);
      canvas.setHeight(adjustedHeight);
      canvas.renderAll();
    }, [containerWidth, containerHeight, isPdf]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }, []);

    // Undo 구현
    const handleUndo = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const snapshot = useToolsStore.getState().undo();
      if (snapshot) {
        canvas.loadFromJSON(snapshot, () => {
          canvas.renderAll();
        });
      }
    }, []);

    // Redo 구현
    const handleRedo = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const snapshot = useToolsStore.getState().redo();
      if (snapshot) {
        canvas.loadFromJSON(snapshot, () => {
          canvas.renderAll();
        });
      }
    }, []);

    // Clear 구현
    const handleClear = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.clear();
      useToolsStore.getState().clearUndo();
      useToolsStore.getState().clearRedo();
      useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));
    }, []);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        handleUndo,
        handleRedo,
        handleClear,
      }),
      [handleUndo, handleRedo, handleClear]
    );

    // 캔버스는 전체 높이를 사용 (PDF 뷰어와 동일한 높이)
    const canvasHeight = Math.max(containerHeight, 100);

    return (
      <canvas
        ref={canvasRef}
        width={containerWidth}
        height={canvasHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${containerWidth}px`,
          height: `${canvasHeight}px`,
          cursor: isEnabled && isDrawingMode ? "crosshair" : "default",
          // 뷰어 모드에서도 필기가 보이도록 항상 표시
          opacity: isEnabled ? 1 : 0,
          // 뷰어 모드: 필기 보기만 가능 (상호작용 불가)
          // 필기 모드일 때만 마우스 이벤트 수신
          pointerEvents: isEnabled && isDrawingMode ? "auto" : "none",
          // z-index를 낮춰서 우측 사이드 패널이 위에 있도록 함
          // (사이드 패널의 버튼 클릭이 가능해야 함)
          zIndex: isDrawingMode ? 5 : -1,
          // 항상 표시 (뷰어 모드에서도 필기 기록이 보임)
          display: isEnabled ? "block" : "none",
        }}
      />
    );
  }
);

PDFDrawingOverlay.displayName = "PDFDrawingOverlay";

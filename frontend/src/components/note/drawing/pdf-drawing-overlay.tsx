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
import { createShapeByClick, type ClickShapeInfo, type ShapeType } from "@/lib/utils/shapes";
import { CollaborativeCanvasWrapper } from "./collaborative-canvas-wrapper";

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
  containerWidth: number;   // PDF 원본 크기 (baseWidth)
  containerHeight: number;  // PDF 원본 크기 (baseHeight)
  pdfScale: number;         // PDF 현재 스케일
  renderedWidth?: number;   // PDF 캔버스의 실제 CSS 크기
  renderedHeight?: number;  // PDF 캔버스의 실제 CSS 크기
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
      pdfScale,
      renderedWidth,
      renderedHeight,
      isPdf,
      onSave,
      isCollaborative = false,
    },
    ref
  ) => {
    // div container를 사용 - Fabric.js가 canvas를 동적 생성
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 도구 상태 직접 구독
    const drawStore = useDrawStore();
    const toolsStore = useToolsStore();
    const currentTool = drawStore.type;
    const penColor = drawStore.lineColor;
    const penSize = drawStore.lineWidth;

    // syncToStorage 함수 ref (협업 래퍼에서 설정됨)
    const syncToStorageRef = useRef<((canvas: fabric.Canvas) => void) | null>(null);

    // 현재 캔버스 크기 추적 (리사이즈 감지용)
    const currentCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);

    // div container 크기 (캔버스와 동기화)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

    // Canvas 초기화 (최초 1회만 실행)
    useEffect(() => {
      if (!containerRef.current || !isEnabled) return;

      // renderedWidth/Height가 없으면 대기
      if (!renderedWidth || !renderedHeight) return;

      // 이미 캔버스가 있으면 초기화 건너뜀 (크기 변경은 별도 useEffect에서 처리)
      if (fabricCanvasRef.current) return;

      const container = containerRef.current;
      const finalWidth = renderedWidth;
      const finalHeight = renderedHeight;

      // container 내용물 정리
      container.innerHTML = '';

      // canvas 엘리먼트 동적 생성
      const canvasElement = document.createElement('canvas');
      canvasElement.width = finalWidth;
      canvasElement.height = finalHeight;
      container.appendChild(canvasElement);

      // Fabric Canvas 생성
      const canvas = new fabric.Canvas(canvasElement, {
        width: finalWidth,
        height: finalHeight,
        isDrawingMode: false,
        backgroundColor: 'transparent',
      });

      fabricCanvasRef.current = canvas;
      currentCanvasSizeRef.current = { width: finalWidth, height: finalHeight };
      setContainerSize({ width: finalWidth, height: finalHeight });

      // 초기 히스토리 저장
      useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

      return () => {
        try {
          if (fabricCanvasRef.current) {
            const canvasToDispose = fabricCanvasRef.current;
            fabricCanvasRef.current = null;
            currentCanvasSizeRef.current = null;
            setContainerSize(null);

            canvasToDispose.off();
            canvasToDispose.clear();

            try {
              canvasToDispose.dispose();
            } catch (disposeError) {
              // dispose 에러는 무시
            }
          }

          if (container) {
            container.innerHTML = '';
          }
        } catch (error) {
          console.error("Canvas cleanup error:", error);
          fabricCanvasRef.current = null;
        }
      };
    }, [containerRef, isEnabled, isPdf]);

    // Canvas 크기 변경 처리 (캔버스 재생성 없이 리사이즈)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !renderedWidth || !renderedHeight) return;

      const prevSize = currentCanvasSizeRef.current;
      if (!prevSize) {
        currentCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
        return;
      }

      // 크기가 같으면 무시
      if (prevSize.width === renderedWidth && prevSize.height === renderedHeight) return;

      const scaleX = renderedWidth / prevSize.width;
      const scaleY = renderedHeight / prevSize.height;

      // 캔버스 크기 변경
      canvas.setDimensions({ width: renderedWidth, height: renderedHeight });

      // 모든 객체에 스케일 적용
      canvas.getObjects().forEach((obj: fabric.FabricObject) => {
        obj.scaleX = (obj.scaleX || 1) * scaleX;
        obj.scaleY = (obj.scaleY || 1) * scaleY;
        obj.left = (obj.left || 0) * scaleX;
        obj.top = (obj.top || 0) * scaleY;

        // Path 객체 (펜/형광펜)의 경우 strokeWidth도 조정
        if (obj.type === 'path') {
          obj.strokeWidth = (obj.strokeWidth || 1) * Math.min(scaleX, scaleY);
        }

        obj.setCoords();
      });

      canvas.renderAll();
      currentCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
      setContainerSize({ width: renderedWidth, height: renderedHeight });
    }, [renderedWidth, renderedHeight])

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

        // 브러시 크기 설정 - PDF 스케일에 비례하여 조정
        canvas.freeDrawingBrush.width = drawStore.lineWidth * pdfScale;

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
          // 지우개 모드: 선택 불가능하지만 이벤트 감지는 활성화 (findTarget 작동 필요)
          obj.selectable = false;
          obj.evented = true;
        } else if (isSelectionMode) {
          // 손 아이콘 모드: 모든 객체 선택 가능
          obj.selectable = true;
          obj.evented = true;
        } else {
          // 펜/도형 모드: 선택 및 이벤트 비활성화
          obj.selectable = false;
          obj.evented = false;
        }
      });
    }, [drawStore.type, drawStore.lineColor, drawStore.lineWidth, isDrawingMode, pdfScale]);

    // Auto-save drawing data to database (debounced)
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
          if (isCollaborative && syncToStorageRef.current) {
            syncToStorageRef.current(canvas);
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
    }, [onSave, noteId, fileId, pageNum, isCollaborative]);

    // 클릭 이벤트로 도형 생성 (드래그 불필요)
    const handleClick = useCallback(
      (event: any) => {
        if (!isEnabled || !isDrawingMode || !fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const toolType = drawStore.type as ShapeType;

        // 펜/형광펜/지우개/hand 모드는 별도 처리
        if (toolType === 'pen' || toolType === 'highlighter' || toolType === 'eraser' || toolType === 'hand') {
          return;
        }

        const pos = canvas.getPointer(event.e as MouseEvent);

        // 캔버스 경계 체크
        const adjustedHeight = Math.max(containerHeight, 100);
        if (pos.x < 0 || pos.x > containerWidth || pos.y < 0 || pos.y > adjustedHeight) {
          return;
        }

        // 히스토리 저장 (도형 추가 전)
        useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

        // 클릭한 위치에 고정 크기 도형 생성 - PDF 스케일 적용
        const shapeInfo: ClickShapeInfo = {
          x: pos.x,
          y: pos.y,
          lineColor: drawStore.lineColor,
          lineWidth: drawStore.lineWidth * pdfScale,
        };

        const shape = createShapeByClick(shapeInfo, toolType);

        if (shape) {
          canvas.add(shape);
          canvas.setActiveObject(shape); // 생성 후 바로 선택 상태로
          canvas.renderAll();

          // 자동 저장 트리거
          triggerAutoSave();
        }
      },
      [isEnabled, isDrawingMode, drawStore.type, drawStore.lineColor, drawStore.lineWidth, containerWidth, containerHeight, triggerAutoSave, pdfScale]
    );

    // Canvas 클릭 이벤트 핸들러 바인딩 (지우개 + 도형)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      // 펜/형광펜은 Fabric의 자동 처리를 사용
      const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';

      if (isFreeDrawingMode) {
        return;
      }

      // 지우개 모드: 드래그하면서 지나가는 객체 삭제
      let isErasing = false;
      let erasedObjects: fabric.FabricObject[] = [];
      let snapshotSaved = false;

      const onEraserDown = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (drawStore.type !== 'eraser') return;
        isErasing = true;
        erasedObjects = [];
        snapshotSaved = false;

        // 드래그 시작 시 타겟이 있으면 삭제
        const target = opt.target;
        if (target && !(target as any).isPreview) {
          if (!snapshotSaved) {
            useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));
            snapshotSaved = true;
          }
          erasedObjects.push(target);
          canvas.remove(target);
          canvas.renderAll();
        }
      };

      const onEraserMove = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (drawStore.type !== 'eraser' || !isErasing) return;

        const target = opt.target;
        if (target && !(target as any).isPreview && !erasedObjects.includes(target)) {
          if (!snapshotSaved) {
            useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));
            snapshotSaved = true;
          }
          erasedObjects.push(target);
          canvas.remove(target);
          canvas.renderAll();
        }
      };

      const onEraserUp = () => {
        if (drawStore.type !== 'eraser') return;
        if (isErasing && erasedObjects.length > 0) {
          console.log('[Eraser] Objects removed:', erasedObjects.length);
          triggerAutoSave();
        }
        isErasing = false;
        erasedObjects = [];
        snapshotSaved = false;
      };

      // 지우개 모드
      if (drawStore.type === 'eraser') {
        canvas.on('mouse:down', onEraserDown);
        canvas.on('mouse:move', onEraserMove);
        canvas.on('mouse:up', onEraserUp);
      } else {
        // 도형 모드
        canvas.on('mouse:down', handleClick);
      }

      return () => {
        canvas.off('mouse:down', onEraserDown);
        canvas.off('mouse:move', onEraserMove);
        canvas.off('mouse:up', onEraserUp);
        canvas.off('mouse:down', handleClick);
      };
    }, [handleClick, drawStore.type, isDrawingMode, isEnabled, triggerAutoSave]);

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

    // 이 useEffect는 위의 "Canvas 크기 업데이트"와 중복되어 제거됨
    // containerWidth, containerHeight가 변경될 때 이미 위에서 처리됨

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
      <>
        {/*
          PDF Canvas와 정확히 같은 위치/크기에 오버레이
          - 명시적인 width/height로 PDF 캔버스와 동일한 크기 지정
          - position absolute로 PDF 캔버스 위에 겹침
        */}
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            // 캔버스 크기와 동기화된 크기 사용 (prop 대신 state)
            width: containerSize?.width ?? renderedWidth,
            height: containerSize?.height ?? renderedHeight,
            cursor: isEnabled && isDrawingMode ? "crosshair" : "default",
            // 뷰어 모드에서도 필기가 보이도록 항상 표시
            opacity: isEnabled ? 1 : 0,
            // 뷰어 모드: 필기 보기만 가능 (상호작용 불가)
            pointerEvents: isEnabled && isDrawingMode ? "auto" : "none",
            // z-index를 낮춰서 우측 사이드 패널이 위에 있도록 함
            zIndex: isDrawingMode ? 5 : 1,
            // 항상 표시 (뷰어 모드에서도 필기 기록이 보임)
            display: isEnabled ? "block" : "none",
            // DEBUG: Drawing overlay 테두리 (빨간색)
            outline: "3px solid red",
          }}
        />

        {/* 협업 모드일 때만 Liveblocks 동기화 활성화 */}
        {isCollaborative && (
          <CollaborativeCanvasWrapper
            fabricCanvas={fabricCanvasRef.current}
            fileId={fileId}
            pageNum={pageNum}
            syncToStorageRef={syncToStorageRef}
          />
        )}
      </>
    );
  }
);

PDFDrawingOverlay.displayName = "PDFDrawingOverlay";

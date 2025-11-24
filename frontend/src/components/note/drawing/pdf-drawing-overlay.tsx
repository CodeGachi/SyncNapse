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
import type { DrawingData } from "@/lib/types/drawing";
import { createShapeByDrag, type DragShapeInfo, type ShapeType } from "@/lib/utils/shapes";
import { CollaborativeCanvasWrapper } from "./collaborative-canvas-wrapper";
import { getDrawing } from "@/lib/db/drawings";

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
      containerWidth: _containerWidth,
      containerHeight: _containerHeight,
      pdfScale,
      renderedWidth,
      renderedHeight,
      isPdf,
      onSave,
      isCollaborative = false,
    },
    ref
  ) => {
    // 🔍 DEBUG: 컴포넌트 렌더링 로그
    console.log('[Drawing] 🔄 Render - pageNum:', pageNum, 'noteId:', noteId, 'fileId:', fileId, 'isCollaborative:', isCollaborative);

    // div container를 사용 - Fabric.js가 canvas를 동적 생성
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 도구 상태 직접 구독
    const drawStore = useDrawStore();

    // syncToStorage 함수 ref (협업 래퍼에서 설정됨)
    const syncToStorageRef = useRef<((canvas: fabric.Canvas) => void) | null>(null);

    // 현재 캔버스 크기 추적 (리사이즈 감지용)
    const currentCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);

    // 초기 캔버스 크기 저장 (원본 기준 스케일링용)
    const initialCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);

    // div container 크기 (캔버스와 동기화)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

    // Undo/Redo 스택 (createdAt 타임스탬프 기반)
    const undoStackRef = useRef<fabric.FabricObject[]>([]);  // 삭제된 객체들 (Redo용)
    const lastActionRef = useRef<'undo' | 'redo' | null>(null);

    // 페이지 전환 추적 (BlockNote 패턴)
    const prevPageNumRef = useRef<number>(pageNum);
    const isInitialMountRef = useRef<boolean>(true);
    const hasLoadedRef = useRef<boolean>(false);
    // 콘텐츠 로드 트리거 상태
    const [shouldLoadContent, setShouldLoadContent] = useState<boolean>(true);

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
      initialCanvasSizeRef.current = { width: finalWidth, height: finalHeight }; // 초기 크기 저장
      setContainerSize({ width: finalWidth, height: finalHeight });

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

    // 페이지 전환 감지 (BlockNote 패턴)
    useEffect(() => {
      // 초기 마운트 시 스킵
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        prevPageNumRef.current = pageNum;
        console.log('[Drawing] ⏭️ Initial mount, page:', pageNum);
        return;
      }

      // 실제 페이지 변경 시에만 트리거
      if (prevPageNumRef.current !== pageNum) {
        console.log('[Drawing] 📄 Page changed:', prevPageNumRef.current, '->', pageNum);
        prevPageNumRef.current = pageNum;

        // Undo/Redo 스택 초기화
        undoStackRef.current = [];
        lastActionRef.current = null;

        // 비협업 모드에서만 캔버스 클리어 및 IndexedDB 로드
        // (협업 모드에서는 collaborative-canvas-sync.tsx가 처리)
        if (!isCollaborative) {
          const canvas = fabricCanvasRef.current;
          if (canvas) {
            canvas.clear();
            canvas.renderAll();
            console.log('[Drawing] 🧹 Canvas cleared for page change (non-collaborative)');
          }
          hasLoadedRef.current = false;
          setShouldLoadContent(true);
        }
      }
    }, [pageNum, isCollaborative]);

    // 페이지 데이터 로드 (shouldLoadContent 트리거)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !noteId || !fileId) return;
      if (isCollaborative) return;
      if (!shouldLoadContent || hasLoadedRef.current) return;

      const loadPageData = async () => {
        console.log(`[Drawing] 🔍 Loading page ${pageNum} data...`);

        try {
          // IndexedDB에서 해당 페이지의 필기 데이터 로드
          const drawingData = await getDrawing(noteId, fileId, pageNum);

          if (drawingData?.canvas) {
            console.log(`[Drawing] ✅ Page ${pageNum} data found, loading...`);

            // Fabric.js 캔버스에 데이터 로드
            canvas.loadFromJSON(drawingData.canvas, () => {
              canvas.renderAll();
              console.log(`[Drawing] ✅ Page ${pageNum} data loaded`);
            });
          } else {
            console.log(`[Drawing] ℹ️ Page ${pageNum} has no saved data`);
          }

          hasLoadedRef.current = true;
          setShouldLoadContent(false);
        } catch (error) {
          console.error(`[Drawing] ❌ Page ${pageNum} load failed:`, error);
          setShouldLoadContent(false);
        }
      };

      loadPageData();
    }, [shouldLoadContent, pageNum, noteId, fileId, isCollaborative]);

    // Canvas 크기 변경 처리 (줌/리사이즈)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !renderedWidth || !renderedHeight) return;

      const prevSize = currentCanvasSizeRef.current;

      // 첫 실행 시 초기화
      if (!prevSize) {
        currentCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
        initialCanvasSizeRef.current = { width: renderedWidth, height: renderedHeight };
        return;
      }

      // 크기가 같으면 무시
      if (prevSize.width === renderedWidth && prevSize.height === renderedHeight) return;

      // 스케일 계산
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
          // 캔버스 JSON 변환
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


    // Canvas 이벤트 핸들러 바인딩 (지우개 + 도형 드래그)
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

      // 도형 드래그 모드
      let isDrawingShape = false;
      let shapeStartPos: { x: number; y: number } | null = null;
      let previewShape: fabric.Object | null = null;

      const toolType = drawStore.type as ShapeType;
      const isShapeMode = toolType === 'solidLine' || toolType === 'arrowLine' || toolType === 'rect' || toolType === 'circle';

      // 지우개 핸들러
      const onEraserDown = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (drawStore.type !== 'eraser') return;
        isErasing = true;
        erasedObjects = [];

        const target = opt.target;
        if (target && !(target as any).isPreview) {
          erasedObjects.push(target);
          canvas.remove(target);
          canvas.renderAll();
        }
      };

      const onEraserMove = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (drawStore.type !== 'eraser' || !isErasing) return;

        const target = opt.target;
        if (target && !(target as any).isPreview && !erasedObjects.includes(target)) {
          erasedObjects.push(target);
          canvas.remove(target);
          canvas.renderAll();
        }
      };

      const onEraserUp = () => {
        if (drawStore.type !== 'eraser') return;
        if (isErasing && erasedObjects.length > 0) {
          triggerAutoSave();
        }
        isErasing = false;
        erasedObjects = [];
      };

      // 도형 드래그 핸들러
      const onShapeDown = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (!isShapeMode) return;
        // 기존 객체 클릭 시 무시 (선택 허용)
        if (opt.target) return;

        const pos = canvas.getPointer(opt.e as MouseEvent);
        isDrawingShape = true;
        shapeStartPos = { x: pos.x, y: pos.y };
      };

      const onShapeMove = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (!isShapeMode || !isDrawingShape || !shapeStartPos) return;

        const pos = canvas.getPointer(opt.e as MouseEvent);

        // 기존 프리뷰 제거
        if (previewShape) {
          canvas.remove(previewShape);
        }

        // 새 프리뷰 생성
        const shapeInfo: DragShapeInfo = {
          startX: shapeStartPos.x,
          startY: shapeStartPos.y,
          endX: pos.x,
          endY: pos.y,
          lineColor: drawStore.lineColor,
          lineWidth: drawStore.lineWidth * pdfScale,
        };

        previewShape = createShapeByDrag(shapeInfo, toolType);
        if (previewShape) {
          (previewShape as any).isPreview = true;
          previewShape.selectable = false;
          previewShape.evented = false;
          previewShape.opacity = 0.5;
          canvas.add(previewShape);
          canvas.renderAll();
        }
      };

      const onShapeUp = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        if (!isShapeMode || !isDrawingShape || !shapeStartPos) return;

        const pos = canvas.getPointer(opt.e as MouseEvent);

        // 프리뷰 제거
        if (previewShape) {
          canvas.remove(previewShape);
          previewShape = null;
        }

        // 최종 도형 생성
        const shapeInfo: DragShapeInfo = {
          startX: shapeStartPos.x,
          startY: shapeStartPos.y,
          endX: pos.x,
          endY: pos.y,
          lineColor: drawStore.lineColor,
          lineWidth: drawStore.lineWidth * pdfScale,
        };

        const finalShape = createShapeByDrag(shapeInfo, toolType);
        if (finalShape) {
          // 생성 시간 메타데이터 추가
          (finalShape as any).createdAt = Date.now();
          // 새로운 도형 생성 시 Redo 스택 초기화
          undoStackRef.current = [];

          canvas.add(finalShape);
          canvas.setActiveObject(finalShape);
          canvas.renderAll();
          triggerAutoSave();
        }

        isDrawingShape = false;
        shapeStartPos = null;
      };

      // 이벤트 등록
      if (drawStore.type === 'eraser') {
        canvas.on('mouse:down', onEraserDown);
        canvas.on('mouse:move', onEraserMove);
        canvas.on('mouse:up', onEraserUp);
      } else if (isShapeMode) {
        canvas.on('mouse:down', onShapeDown);
        canvas.on('mouse:move', onShapeMove);
        canvas.on('mouse:up', onShapeUp);
      }

      return () => {
        canvas.off('mouse:down', onEraserDown);
        canvas.off('mouse:move', onEraserMove);
        canvas.off('mouse:up', onEraserUp);
        canvas.off('mouse:down', onShapeDown);
        canvas.off('mouse:move', onShapeMove);
        canvas.off('mouse:up', onShapeUp);
      };
    }, [drawStore.type, drawStore.lineColor, drawStore.lineWidth, isDrawingMode, isEnabled, triggerAutoSave, pdfScale]);

    // Fabric.js 자유 그리기 이벤트 처리 (펜/형광펜 모드용)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      const handlePathCreated = (e: { path: fabric.FabricObject }) => {
        const path = e.path;
        if (path) {
          // 생성 시간 메타데이터 추가
          (path as any).createdAt = Date.now();
          // 새로운 그리기 시 Redo 스택 초기화
          undoStackRef.current = [];
          lastActionRef.current = null;
        }
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

    // Undo 구현 (createdAt 기준으로 가장 최근 객체 삭제)
    const handleUndo = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const objects = canvas.getObjects();
      if (objects.length === 0) return;

      // createdAt 기준으로 가장 최근 객체 찾기
      let latestObj: fabric.FabricObject | null = null;
      let latestTime = 0;

      objects.forEach((obj) => {
        const createdAt = (obj as any).createdAt || 0;
        if (createdAt > latestTime) {
          latestTime = createdAt;
          latestObj = obj;
        }
      });

      if (latestObj) {
        // Redo 스택에 추가
        undoStackRef.current.push(latestObj);
        lastActionRef.current = 'undo';
        // 캔버스에서 제거
        canvas.remove(latestObj);
        canvas.renderAll();
        triggerAutoSave();
      }
    }, [triggerAutoSave]);

    // Redo 구현 (Undo 스택에서 복원)
    const handleRedo = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      if (undoStackRef.current.length === 0) return;

      // Undo 스택에서 마지막 객체 꺼내기
      const objToRestore = undoStackRef.current.pop();
      if (objToRestore) {
        lastActionRef.current = 'redo';
        canvas.add(objToRestore);
        canvas.renderAll();
        triggerAutoSave();
      }
    }, [triggerAutoSave]);

    // Clear 구현
    const handleClear = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Undo 스택 초기화
      undoStackRef.current = [];
      lastActionRef.current = null;

      canvas.clear();
      canvas.renderAll();
      triggerAutoSave();
    }, [triggerAutoSave]);

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

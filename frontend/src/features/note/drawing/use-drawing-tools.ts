/**
 * 드로잉 도구 이벤트 핸들링 훅
 *
 * 지우개 모드와 도형 드래그 모드의 마우스 이벤트 처리
 * 펜/형광펜 자유 그리기 이벤트 처리
 */

import { useEffect } from "react";
import * as fabric from "fabric";
import { useDrawStore } from "@/stores/draw-store";
import { createShapeByDrag, type DragShapeInfo, type ShapeType } from "@/lib/utils/shapes";

export interface UseDrawingToolsProps {
  fabricCanvas: fabric.Canvas | null;
  isDrawingMode: boolean;
  isEnabled: boolean;
  pdfScale: number;
  /** Undo 스택 ref (새 객체 생성 시 초기화) */
  undoStackRef: React.MutableRefObject<fabric.FabricObject[]>;
  /** 자동 저장 트리거 */
  onAutoSave: () => void;
}

/**
 * 드로잉 도구 이벤트 핸들링 훅
 */
export function useDrawingTools({
  fabricCanvas,
  isDrawingMode,
  isEnabled,
  pdfScale,
  undoStackRef,
  onAutoSave,
}: UseDrawingToolsProps): void {
  const drawStore = useDrawStore();

  // 펜 모드 설정 (펜/형광펜 자유 그리기)
  useEffect(() => {
    if (!fabricCanvas) return;

    const isFreeDrawingMode = drawStore.type === "pen" || drawStore.type === "highlighter";
    const isSelectionMode = drawStore.type === "hand";
    const isEraserMode = drawStore.type === "eraser";

    // 자유 그리기 모드 설정
    fabricCanvas.isDrawingMode = isFreeDrawingMode && isDrawingMode;

    // 펜 모드일 때 PencilBrush 초기화
    if (isFreeDrawingMode && isDrawingMode) {
      fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      fabricCanvas.freeDrawingBrush.color = drawStore.lineColor;
      fabricCanvas.freeDrawingBrush.width = drawStore.lineWidth * pdfScale;

      // 형광펜은 투명도 설정
      if (drawStore.type === "highlighter") {
        (fabricCanvas.freeDrawingBrush as any).globalAlpha = 0.3;
      } else {
        (fabricCanvas.freeDrawingBrush as any).globalAlpha = 1;
      }
    } else {
      fabricCanvas.isDrawingMode = false;
    }

    // 선택 가능 여부 설정
    fabricCanvas.forEachObject((obj) => {
      if (isEraserMode) {
        obj.selectable = false;
        obj.evented = true;
      } else if (isSelectionMode) {
        obj.selectable = true;
        obj.evented = true;
      } else {
        obj.selectable = false;
        obj.evented = false;
      }
    });
  }, [fabricCanvas, drawStore.type, drawStore.lineColor, drawStore.lineWidth, isDrawingMode, pdfScale]);

  // 지우개 + 도형 드래그 이벤트 핸들러
  useEffect(() => {
    if (!fabricCanvas || !isDrawingMode) return;

    const isFreeDrawingMode = drawStore.type === "pen" || drawStore.type === "highlighter";
    if (isFreeDrawingMode) return;

    // 지우개 상태
    let isErasing = false;
    let erasedObjects: fabric.FabricObject[] = [];

    // 도형 드래그 상태
    let isDrawingShape = false;
    let shapeStartPos: { x: number; y: number } | null = null;
    let previewShape: fabric.Object | null = null;

    const toolType = drawStore.type as ShapeType;
    const isShapeMode =
      toolType === "solidLine" ||
      toolType === "arrowLine" ||
      toolType === "rect" ||
      toolType === "circle";

    // 지우개 핸들러
    const onEraserDown = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (drawStore.type !== "eraser") return;
      isErasing = true;
      erasedObjects = [];

      const target = opt.target;
      if (target && !(target as any).isPreview) {
        erasedObjects.push(target);
        fabricCanvas.remove(target);
        fabricCanvas.renderAll();
      }
    };

    const onEraserMove = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (drawStore.type !== "eraser" || !isErasing) return;

      const target = opt.target;
      if (target && !(target as any).isPreview && !erasedObjects.includes(target)) {
        erasedObjects.push(target);
        fabricCanvas.remove(target);
        fabricCanvas.renderAll();
      }
    };

    const onEraserUp = () => {
      if (drawStore.type !== "eraser") return;
      if (isErasing && erasedObjects.length > 0) {
        onAutoSave();
      }
      isErasing = false;
      erasedObjects = [];
    };

    // 도형 드래그 핸들러
    const onShapeDown = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (!isShapeMode) return;
      if (opt.target) return;

      const pos = fabricCanvas.getPointer(opt.e as MouseEvent);
      isDrawingShape = true;
      shapeStartPos = { x: pos.x, y: pos.y };
    };

    const onShapeMove = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (!isShapeMode || !isDrawingShape || !shapeStartPos) return;

      const pos = fabricCanvas.getPointer(opt.e as MouseEvent);

      if (previewShape) {
        fabricCanvas.remove(previewShape);
      }

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
        fabricCanvas.add(previewShape);
        fabricCanvas.renderAll();
      }
    };

    const onShapeUp = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (!isShapeMode || !isDrawingShape || !shapeStartPos) return;

      const pos = fabricCanvas.getPointer(opt.e as MouseEvent);

      if (previewShape) {
        fabricCanvas.remove(previewShape);
        previewShape = null;
      }

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
        (finalShape as any).createdAt = Date.now();
        undoStackRef.current = [];

        fabricCanvas.add(finalShape);
        fabricCanvas.setActiveObject(finalShape);
        fabricCanvas.renderAll();
        onAutoSave();
      }

      isDrawingShape = false;
      shapeStartPos = null;
    };

    // 이벤트 등록
    if (drawStore.type === "eraser") {
      fabricCanvas.on("mouse:down", onEraserDown);
      fabricCanvas.on("mouse:move", onEraserMove);
      fabricCanvas.on("mouse:up", onEraserUp);
    } else if (isShapeMode) {
      fabricCanvas.on("mouse:down", onShapeDown);
      fabricCanvas.on("mouse:move", onShapeMove);
      fabricCanvas.on("mouse:up", onShapeUp);
    }

    return () => {
      fabricCanvas.off("mouse:down", onEraserDown);
      fabricCanvas.off("mouse:move", onEraserMove);
      fabricCanvas.off("mouse:up", onEraserUp);
      fabricCanvas.off("mouse:down", onShapeDown);
      fabricCanvas.off("mouse:move", onShapeMove);
      fabricCanvas.off("mouse:up", onShapeUp);
    };
  }, [
    fabricCanvas,
    drawStore.type,
    drawStore.lineColor,
    drawStore.lineWidth,
    isDrawingMode,
    isEnabled,
    onAutoSave,
    pdfScale,
    undoStackRef,
  ]);

  // 펜/형광펜 path:created 이벤트
  useEffect(() => {
    if (!fabricCanvas || !isDrawingMode) return;

    const handlePathCreated = (e: { path: fabric.FabricObject }) => {
      const path = e.path;
      if (path) {
        (path as any).createdAt = Date.now();
        undoStackRef.current = [];
      }
      onAutoSave();
    };

    fabricCanvas.on("path:created", handlePathCreated);

    return () => {
      fabricCanvas.off("path:created", handlePathCreated);
    };
  }, [fabricCanvas, isDrawingMode, onAutoSave, undoStackRef]);
}

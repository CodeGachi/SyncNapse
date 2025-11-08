/**
 * Canvas Drawing Hook - 마이그레이션: drawing-board의 PicBoard.vue 로직을 React로 포팅
 * Fabric.js 캔버스 초기화, 이벤트 핸들링, 도형 생성
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useDrawStore } from '@/stores/draw-store';
import { useToolsStore } from '@/stores/tools-store';
import { drawShape, getShapeDimensions, type DrawInfo } from '@/lib/utils/shapes';

export interface UseCanvasDrawingReturn {
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  handleClear: () => void;
}

interface UseCanvasDrawingProps {
  canvasElement: HTMLCanvasElement | null;
  containerWidth: number;
  containerHeight: number;
  isEnabled: boolean;
  isDrawingMode: boolean;
}

export const useCanvasDrawing = ({
  canvasElement,
  containerWidth,
  containerHeight,
  isEnabled,
  isDrawingMode,
}: UseCanvasDrawingProps): UseCanvasDrawingReturn => {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Zustand stores
  const drawStore = useDrawStore();

  // Canvas 초기화
  useEffect(() => {
    if (!canvasElement || !isEnabled) return;

    // 기존 canvas 정리
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    // 새 Canvas 생성
    const canvas = new fabric.Canvas(canvasElement, {
      width: containerWidth,
      height: containerHeight,
      isDrawingMode: false,
      backgroundColor: 'transparent',
    });

    fabricCanvasRef.current = canvas;

    // 초기 히스토리 저장
    const currentToolsStore = useToolsStore.getState();
    currentToolsStore.saveSnapshot(JSON.stringify(canvas.toJSON()));

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [canvasElement, containerWidth, containerHeight, isEnabled]);

  // 펜 모드 설정 (펜/형광펜 자유 그리기)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // pen과 highlighter는 자유 그리기 모드, 다른 도구는 선택 모드
    const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';
    const isSelectionMode = drawStore.type === 'hand'; // 손 아이콘 = 선택 도구
    const isEraserMode = drawStore.type === 'eraser';

    // 자유 그리기 모드 설정
    canvas.isDrawingMode = isFreeDrawingMode && isDrawingMode;

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

    // 브러시 설정
    if (isFreeDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = drawStore.lineColor;
      canvas.freeDrawingBrush.width = drawStore.lineWidth;

      // 형광펜은 투명도 설정
      if (drawStore.type === 'highlighter') {
        (canvas.freeDrawingBrush as any).globalAlpha = 0.3;
      } else {
        (canvas.freeDrawingBrush as any).globalAlpha = 1;
      }
    }
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

  // 마우스 다운 이벤트
  const handleMouseDown = useCallback(
    (event: any) => {
      if (!isEnabled || !isDrawingMode || !fabricCanvasRef.current) return;

      setIsDrawing(true);
      const pos = fabricCanvasRef.current.getPointer(event.e as MouseEvent);
      setStartPos(pos);
      drawStore.setMouseFrom(pos);

      // 히스토리 저장
      useToolsStore.getState().saveSnapshot(
        JSON.stringify(fabricCanvasRef.current.toJSON())
      );
    },
    [isEnabled, isDrawingMode, drawStore]
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
      drawStore.setMouseTo(pos);

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
      drawStore,
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
        const eraserRadius = drawStore.lineWidth / 2;
        const objectsToRemove: fabric.Object[] = [];

        canvas.forEachObject((obj) => {
          // 지우개 원형 영역과 객체의 충돌 감지
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
        }
      }

      setIsDrawing(false);
      setStartPos(null);
    },
    [isDrawing, startPos, drawStore]
  );

  // Canvas 이벤트 핸들러 바인딩 - 도형 그리기용 (펜 모드 제외)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // 펜/형광펜은 Fabric의 자동 처리를 사용하므로 이벤트 핸들러 등록 안 함
    const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';
    if (isFreeDrawingMode) {
      return; // 펜 모드는 이벤트 핸들러 제외
    }

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, drawStore.type]);

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
    const store = useToolsStore.getState();
    store.clearUndo();
    store.clearRedo();
    store.saveSnapshot(JSON.stringify(canvas.toJSON()));
  }, []);

  return {
    fabricCanvasRef,
    canUndo: useToolsStore.getState().getCanUndo(),
    canRedo: useToolsStore.getState().getCanRedo(),
    handleUndo,
    handleRedo,
    handleClear,
  };
};

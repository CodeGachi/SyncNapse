/**
 * Fabric.js Canvas 관리 훅
 * 캔버스 생성, 초기화, 정리
 */

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import type { DrawingTool } from "@/lib/types/drawing";

interface UseDrawingCanvasProps {
  width: number;
  height: number;
  isEnabled: boolean;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export function useDrawingCanvas({
  width,
  height,
  isEnabled,
  onCanvasReady,
}: UseDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Canvas 초기화
  useEffect(() => {
    if (!canvasRef.current || !isEnabled) return;

    try {
      // 기존 캔버스 정리
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      // 새 Fabric Canvas 생성
      const canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: "transparent",
        enableRetinaScaling: true,
      });

      fabricCanvasRef.current = canvas;

      // 포인터 이벤트 활성화 (터치펜, 마우스)
      canvas.enablePointerEvents = true;

      // 콜백
      onCanvasReady?.(canvas);

      return () => {
        // cleanup: 컴포넌트 언마운트 시 정리
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      };
    } catch (error) {
      console.error("Failed to initialize Fabric canvas:", error);
    }
  }, [width, height, isEnabled, onCanvasReady]);

  // 크기 변경 처리
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isEnabled) return;

    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.renderAll();
  }, [width, height, isEnabled]);

  return {
    canvasRef,
    canvas: fabricCanvasRef.current,
  };
}

/**
 * 도구 적용 훅
 */
export function useDrawingTool(
  canvas: fabric.Canvas | null,
  tool: DrawingTool
) {
  useEffect(() => {
    if (!canvas) return;

    switch (tool.type) {
      case "pen":
      case "highlighter": {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = tool.color;
        canvas.freeDrawingBrush.width = tool.strokeWidth;
        (canvas.freeDrawingBrush as any).opacity = tool.opacity;
        break;
      }

      case "eraser": {
        canvas.isDrawingMode = true;
        // Fabric.js v5: PencilBrush 사용 (globalCompositeOperation으로 지우개 효과)
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = tool.strokeWidth;
        // 지우개 효과는 globalCompositeOperation으로 처리
        if (canvas.freeDrawingBrush) {
          (canvas.freeDrawingBrush as any).color = "rgba(255,255,255,1)";
        }
        break;
      }

      case "laser": {
        // 레이저 포인터: 일반 펜 모드 (임시)
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = tool.color;
        canvas.freeDrawingBrush.width = tool.strokeWidth;
        (canvas.freeDrawingBrush as any).opacity = tool.opacity;
        break;
      }

      case "rectangle":
      case "circle":
      case "line":
      case "arrow":
      case "text":
      case "sticky-note": {
        // 도형 모드: 드로잉 모드 비활성화
        canvas.isDrawingMode = false;
        break;
      }
    }
  }, [canvas, tool]);
}

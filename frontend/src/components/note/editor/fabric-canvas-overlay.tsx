/**
 * PDF 위의 필기 캔버스 오버레이 - drawing-board의 canvas 로직을 React로 포팅
 * Fabric.js를 사용한 벡터 드로잉 구현
 */

"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import * as fabric from "fabric";

export interface FabricCanvasOverlayHandle {
  handleUndo: () => void;
  handleRedo: () => void;
  handleClear: () => void;
}

interface FabricCanvasOverlayProps {
  containerWidth: number;
  containerHeight: number;
  currentTool: string;
  lineColor: string;
  lineWidth: number;
  isEnabled: boolean;
  onSave?: (data: { id: string; objects: any[] }) => Promise<void>;
}

export const FabricCanvasOverlay = forwardRef<FabricCanvasOverlayHandle, FabricCanvasOverlayProps>(
  (
    {
      containerWidth,
      containerHeight,
      currentTool,
      lineColor,
      lineWidth,
      isEnabled,
      onSave,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const [history, setHistory] = useState<fabric.Canvas[]>([]);
    const [historyStep, setHistoryStep] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

    // 히스토리 저장
    const saveHistory = useCallback(() => {
      if (!fabricCanvasRef.current) return;

      // 현재 상태 저장
      const currentState = fabricCanvasRef.current.toJSON();
      setHistory((prev) => [...prev.slice(0, historyStep + 1), currentState]);
      setHistoryStep((prev) => prev + 1);
    }, [historyStep]);

    // 미리보기 선 그리기
    const drawPreviewLine = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }, color: string, width: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 객체 제거
        const objects = canvas.getObjects();
        objects.forEach((obj: any) => {
          if (obj.preview) {
            canvas.remove(obj);
          }
        });

        // 선 미리보기 그리기
        const line = new fabric.Line([start.x, start.y, end.x, end.y], {
          stroke: color,
          strokeWidth: width,
          preview: true,
          fill: "transparent",
        });
        canvas.add(line);
        canvas.renderAll();
      },
      []
    );

    // 미리보기 사각형 그리기
    const drawPreviewRect = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }, color: string, width: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 객체 제거
        const objects = canvas.getObjects();
        objects.forEach((obj: any) => {
          if (obj.preview) {
            canvas.remove(obj);
          }
        });

        // 사각형 미리보기 그리기
        const rect = new fabric.Rect({
          left: Math.min(start.x, end.x),
          top: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          fill: "rgba(255, 255, 255, 0)",
          stroke: color,
          strokeWidth: width,
          preview: true,
        });
        canvas.add(rect);
        canvas.renderAll();
      },
      []
    );

    // 미리보기 원 그리기
    const drawPreviewCircle = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }, color: string, width: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 객체 제거
        const objects = canvas.getObjects();
        objects.forEach((obj: any) => {
          if (obj.preview) {
            canvas.remove(obj);
          }
        });

        // 원 미리보기 그리기
        const radius = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) / 2;
        const circle = new fabric.Circle({
          left: start.x,
          top: start.y,
          radius,
          fill: "rgba(255, 255, 255, 0)",
          stroke: color,
          strokeWidth: width,
          preview: true,
        });
        canvas.add(circle);
        canvas.renderAll();
      },
      []
    );

    // 마우스 다운 이벤트
    const handleMouseDown = useCallback(
      (event: any) => {
        if (!isEnabled || !fabricCanvasRef.current) return;

        setIsDrawing(true);
        const pos = fabricCanvasRef.current.getPointer(event.e as MouseEvent);
        setStartPos(pos);

        // 히스토리 저장
        saveHistory();
      },
      [isEnabled, saveHistory]
    );

    // 마우스 이동 이벤트
    const handleMouseMove = useCallback(
      (event: any) => {
        if (!isDrawing || !isEnabled || !fabricCanvasRef.current || !startPos) return;

        const canvas = fabricCanvasRef.current;
        const pos = canvas.getPointer(event.e as MouseEvent);

        // 도구별 미리보기
        if (currentTool === "free") {
          drawPreviewLine(startPos, pos, lineColor, lineWidth);
        } else if (currentTool === "solidLine") {
          drawPreviewLine(startPos, pos, lineColor, lineWidth);
        } else if (currentTool === "dashedLine") {
          drawPreviewLine(startPos, pos, lineColor, lineWidth);
        } else if (currentTool === "rect") {
          drawPreviewRect(startPos, pos, lineColor, lineWidth);
        } else if (currentTool === "circle") {
          drawPreviewCircle(startPos, pos, lineColor, lineWidth);
        } else if (currentTool === "triangle") {
          drawPreviewLine(startPos, pos, lineColor, lineWidth);
        }
      },
      [isDrawing, isEnabled, startPos, currentTool, lineColor, lineWidth, drawPreviewLine, drawPreviewRect, drawPreviewCircle]
    );

    // 마우스 업 이벤트
    const handleMouseUp = useCallback(
      (event: any) => {
        if (!isDrawing || !fabricCanvasRef.current || !startPos) return;

        const canvas = fabricCanvasRef.current;
        const pos = canvas.getPointer(event.e as MouseEvent);

        // 임시 객체 제거 및 실제 객체 추가
        canvas.discardActiveObject();
        canvas.renderAll();

        // 도구에 따른 객체 생성
        if (currentTool === "free") {
          // 자유 그리기: 시작점에서 종료점으로 선 그리기
          const line = new fabric.Line([startPos.x, startPos.y, pos.x, pos.y], {
            stroke: lineColor,
            strokeWidth: lineWidth,
          });
          canvas.add(line);
        } else if (currentTool === "solidLine") {
          const line = new fabric.Line([startPos.x, startPos.y, pos.x, pos.y], {
            stroke: lineColor,
            strokeWidth: lineWidth,
          });
          canvas.add(line);
        } else if (currentTool === "dashedLine") {
          const line = new fabric.Line([startPos.x, startPos.y, pos.x, pos.y], {
            stroke: lineColor,
            strokeWidth: lineWidth,
            strokeDashArray: [3, 5],
          });
          canvas.add(line);
        } else if (currentTool === "rect") {
          const rect = new fabric.Rect({
            left: Math.min(startPos.x, pos.x),
            top: Math.min(startPos.y, pos.y),
            width: Math.abs(pos.x - startPos.x),
            height: Math.abs(pos.y - startPos.y),
            fill: "rgba(255, 255, 255, 0)",
            stroke: lineColor,
            strokeWidth: lineWidth,
          });
          canvas.add(rect);
        } else if (currentTool === "circle") {
          const radius = Math.sqrt((pos.x - startPos.x) ** 2 + (pos.y - startPos.y) ** 2) / 2;
          const circle = new fabric.Circle({
            left: startPos.x,
            top: startPos.y,
            radius,
            fill: "rgba(255, 255, 255, 0)",
            stroke: lineColor,
            strokeWidth: lineWidth,
          });
          canvas.add(circle);
        } else if (currentTool === "triangle") {
          const triangle = new fabric.Triangle({
            left: startPos.x,
            top: startPos.y,
            width: Math.abs(pos.x - startPos.x),
            height: Math.abs(pos.y - startPos.y),
            fill: "rgba(255, 255, 255, 0)",
            stroke: lineColor,
            strokeWidth: lineWidth,
          });
          canvas.add(triangle);
        }

        canvas.renderAll();
        setIsDrawing(false);
        setStartPos(null);
      },
      [isDrawing, startPos, currentTool, lineColor, lineWidth]
    );

    // Fabric.js canvas 초기화
    useEffect(() => {
      if (!canvasRef.current || !isEnabled) return;

      // 기존 canvas 정리
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      // 새 canvas 생성
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: containerHeight,
        isDrawingMode: false,
        backgroundColor: "transparent",
      });

      fabricCanvasRef.current = canvas;

      // 마우스 이벤트 핸들러
      canvas.on("mouse:down", handleMouseDown);
      canvas.on("mouse:move", handleMouseMove);
      canvas.on("mouse:up", handleMouseUp);

      return () => {
        canvas.off("mouse:down", handleMouseDown);
        canvas.off("mouse:move", handleMouseMove);
        canvas.off("mouse:up", handleMouseUp);
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }, [isEnabled, containerWidth, containerHeight, handleMouseDown, handleMouseMove, handleMouseUp]);

    // Undo 구현
    const handleUndo = useCallback(() => {
      if (historyStep > 0 && fabricCanvasRef.current) {
        const newStep = historyStep - 1;
        fabricCanvasRef.current.loadFromJSON(history[newStep], () => {
          fabricCanvasRef.current?.renderAll();
        });
      }
    }, [historyStep, history]);

    // Redo 구현
    const handleRedo = useCallback(() => {
      if (historyStep < history.length - 1 && fabricCanvasRef.current) {
        const newStep = historyStep + 1;
        fabricCanvasRef.current.loadFromJSON(history[newStep], () => {
          fabricCanvasRef.current?.renderAll();
        });
      }
    }, [historyStep, history]);

    // Clear 구현
    const handleClear = useCallback(() => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.clear();
        setHistory([]);
      }
    }, []);

    // ref로 메서드 노출
    useImperativeHandle(ref, () => ({
      handleUndo,
      handleRedo,
      handleClear,
    }), [handleUndo, handleRedo, handleClear]);

    return (
      <canvas
        ref={canvasRef}
        width={containerWidth}
        height={containerHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
          cursor: isEnabled ? "crosshair" : "default",
          opacity: isEnabled ? 1 : 0,
          pointerEvents: isEnabled ? "auto" : "none",
          zIndex: 10,
        }}
      />
    );
  }
);

FabricCanvasOverlay.displayName = "FabricCanvasOverlay";

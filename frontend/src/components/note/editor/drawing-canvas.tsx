/**
 * Fabric.js Canvas 래퍼 컴포넌트
 * PDF 위에 필기 레이어 제공
 */

"use client";

import React, { useRef, useEffect, useState } from "react";
import * as fabric from "fabric";
import {
  useDrawingCanvas,
  useDrawingTool,
  useDrawingHistory,
  useDrawingTools,
  useDrawingExport,
} from "@/features/note/editor/drawing";
import { DrawingToolbar } from "./drawing-toolbar";
import {
  DRAWING_TOOL_DEFAULTS,
  type DrawingTool,
  type DrawingToolType,
} from "@/lib/types/drawing";

interface DrawingCanvasProps {
  width: number;
  height: number;
  isEnabled: boolean;
  noteId: string;
  fileId: string;
  pageNum: number;
  onSave?: (data: any) => Promise<void>;
}

export function DrawingCanvas({
  width,
  height,
  isEnabled,
  noteId,
  fileId,
  pageNum,
  onSave,
}: DrawingCanvasProps) {
  const [currentTool, setCurrentTool] = useState<DrawingTool>(
    DRAWING_TOOL_DEFAULTS.pen
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas 초기화
  const { canvasRef, canvas } = useDrawingCanvas({
    width,
    height,
    isEnabled,
    onCanvasReady: (newCanvas) => {
      // Canvas 이벤트 처리
      newCanvas.on("mouse:up", () => {
        historyManager.pushHistory();
        handleAutoSave();
      });

      // 초기 히스토리 추가
      historyManager.pushHistory();
    },
  });

  // 도구 설정
  useDrawingTool(canvas, currentTool);

  // 히스토리 관리
  const historyManager = useDrawingHistory(canvas);

  // 도형 도구
  const {
    addRectangle,
    addCircle,
    addLine,
    addArrow,
    addTextBox,
    addStickyNote,
    deleteSelected,
    deselect,
  } = useDrawingTools({ canvas, tool: currentTool });

  // 내보내기/저장
  const { toDrawingData, clear, download } = useDrawingExport({ canvas });

  // Canvas 클릭 이벤트 (도형 모드)
  useEffect(() => {
    if (!canvas || !isEnabled) return;

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let tempObj: any = null;

    const handleMouseDown = (e: fabric.TEvent) => {
      if (["pen", "highlighter", "eraser", "laser"].includes(currentTool.type)) {
        return; // 자유 드로잉 모드
      }

      isDrawing = true;
      const pointer = canvas.getPointer(e.e as MouseEvent);
      startX = pointer.x;
      startY = pointer.y;
    };

    const handleMouseMove = (e: fabric.TEvent) => {
      if (!isDrawing || !canvas) return;

      const pointer = canvas.getPointer(e.e as MouseEvent);
      const currentX = pointer.x;
      const currentY = pointer.y;

      // 기존 임시 객체 제거
      if (tempObj) {
        canvas.remove(tempObj);
      }

      // 도구별 처리
      switch (currentTool.type) {
        case "rect": {
          tempObj = new fabric.Rect({
            left: Math.min(startX, currentX),
            top: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
            fill: "transparent",
            stroke: currentTool.color,
            strokeWidth: currentTool.strokeWidth,
            strokeOpacity: currentTool.opacity,
          });
          canvas.add(tempObj);
          break;
        }

        case "circle": {
          const radius = Math.max(
            Math.abs(currentX - startX),
            Math.abs(currentY - startY)
          );
          tempObj = new fabric.Circle({
            left: startX,
            top: startY,
            radius,
            fill: "transparent",
            stroke: currentTool.color,
            strokeWidth: currentTool.strokeWidth,
            strokeOpacity: currentTool.opacity,
          });
          canvas.add(tempObj);
          break;
        }

        case "solidLine": {
          if (tempObj) {
            canvas.remove(tempObj);
          }
          tempObj = new fabric.Line([startX, startY, currentX, currentY], {
            stroke: currentTool.color,
            strokeWidth: currentTool.strokeWidth,
            strokeOpacity: currentTool.opacity,
          });
          canvas.add(tempObj);
          break;
        }

        case "arrowLine": {
          if (tempObj) {
            canvas.remove(tempObj);
          }
          // 화살표 미리보기 (선만)
          tempObj = new fabric.Line([startX, startY, currentX, currentY], {
            stroke: currentTool.color,
            strokeWidth: currentTool.strokeWidth,
            strokeOpacity: currentTool.opacity,
          });
          canvas.add(tempObj);
          break;
        }
      }

      canvas.renderAll();
    };

    const handleMouseUp = (e: fabric.TEvent) => {
      if (!isDrawing || !canvas) return;
      isDrawing = false;

      const pointer = canvas.getPointer(e.e as MouseEvent);
      const endX = pointer.x;
      const endY = pointer.y;

      // 임시 객체 제거
      if (tempObj) {
        canvas.remove(tempObj);
      }

      // 도구별 최종 처리
      switch (currentTool.type) {
        case "rect":
          addRectangle(
            Math.min(startX, endX),
            Math.min(startY, endY),
            Math.abs(endX - startX),
            Math.abs(endY - startY)
          );
          break;

        case "circle": {
          const radius = Math.max(
            Math.abs(endX - startX),
            Math.abs(endY - startY)
          );
          addCircle(startX, startY, radius);
          break;
        }

        case "solidLine":
          addLine(startX, startY, endX, endY);
          break;

        case "arrowLine":
          addArrow(startX, startY, endX, endY);
          break;

        case "text":
          addTextBox(startX, startY);
          break;

        case "sticky-note":
          addStickyNote(startX, startY);
          break;
      }

      historyManager.pushHistory();
      handleAutoSave();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
    };
  }, [canvas, currentTool, addRectangle, addCircle, addLine, addArrow, addTextBox, addStickyNote, historyManager, isEnabled]);

  // 자동저장
  const handleAutoSave = async () => {
    if (!onSave || !canvas) return;

    try {
      const data = toDrawingData(noteId, fileId, pageNum);
      if (data) {
        await onSave(data);
      }
    } catch (error) {
      console.error("Failed to auto-save drawing:", error);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnabled) return;

      // Ctrl+Z / Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        historyManager.undo();
        return;
      }

      // Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        historyManager.redo();
        return;
      }

      // Delete: 선택 객체 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        historyManager.pushHistory();
        handleAutoSave();
        return;
      }

      // Escape: 선택 해제
      if (e.key === "Escape") {
        deselect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    historyManager,
    deleteSelected,
    deselect,
    isEnabled,
    noteId,
    pageNum,
  ]);

  return (
    <div
      ref={containerRef}
      className="flex gap-4 bg-[#1E1E1E] rounded-xl p-4 border border-[#575757]"
    >
      {/* 도구모음 */}
      <div className="w-64 flex-shrink-0">
        <DrawingToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          onColorChange={(color) =>
            setCurrentTool((prev) => ({ ...prev, color }))
          }
          onStrokeWidthChange={(width) =>
            setCurrentTool((prev) => ({ ...prev, strokeWidth: width }))
          }
          canUndo={historyManager.canUndo}
          canRedo={historyManager.canRedo}
          onUndo={() => historyManager.undo()}
          onRedo={() => historyManager.redo()}
          onClear={() => {
            clear();
            historyManager.clearHistory();
            historyManager.pushHistory();
          }}
        />
      </div>

      {/* Canvas 영역 */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Canvas */}
        <div
          className="relative bg-white rounded-lg border-2 border-dashed border-gray-300 overflow-hidden"
          style={{ width, height: Math.min(height, 600) }}
        >
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 cursor-crosshair"
          />
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => download(`drawing-${noteId}-${pageNum}`, "png")}
            className="flex-1 px-4 py-2 bg-[#AFC02B] text-white rounded-lg font-medium hover:bg-[#9DB025] transition-colors"
          >
            💾 Download
          </button>
          <button
            onClick={handleAutoSave}
            className="flex-1 px-4 py-2 bg-[#4C4C4C] text-white rounded-lg font-medium hover:bg-[#5C5C5C] transition-colors"
          >
            🔄 Save
          </button>
        </div>
      </div>
    </div>
  );
}

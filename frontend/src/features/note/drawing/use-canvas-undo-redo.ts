/**
 * 캔버스 Undo/Redo 관리 훅
 *
 * createdAt 타임스탬프 기반으로 객체 단위 Undo/Redo 구현
 */

import { useCallback, useRef } from "react";
import * as fabric from "fabric";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useCanvasUndoRedo");

export interface UseCanvasUndoRedoProps {
  /** Fabric.js Canvas 참조 (ref로 전달하여 항상 최신 값 사용) */
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  /** 자동 저장 트리거 */
  onAutoSave: () => void;
}

export interface UseCanvasUndoRedoReturn {
  /** Undo 실행 */
  handleUndo: () => void;
  /** Redo 실행 */
  handleRedo: () => void;
  /** 캔버스 클리어 */
  handleClear: () => void;
  /** Undo 스택 ref (외부에서 초기화 가능) */
  undoStackRef: React.MutableRefObject<fabric.FabricObject[]>;
  /** 스택 초기화 */
  resetStack: () => void;
}

/**
 * 캔버스 Undo/Redo 관리 훅
 */
export function useCanvasUndoRedo({
  fabricCanvasRef,
  onAutoSave,
}: UseCanvasUndoRedoProps): UseCanvasUndoRedoReturn {
  const undoStackRef = useRef<fabric.FabricObject[]>([]);
  const lastActionRef = useRef<"undo" | "redo" | null>(null);

  // 스택 초기화
  const resetStack = useCallback(() => {
    undoStackRef.current = [];
    lastActionRef.current = null;
  }, []);

  // Undo (createdAt 기준 가장 최근 객체 삭제)
  const handleUndo = useCallback(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects();
    if (objects.length === 0) return;

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
      undoStackRef.current.push(latestObj);
      lastActionRef.current = "undo";
      fabricCanvas.remove(latestObj);
      fabricCanvas.renderAll();
      onAutoSave();
    }
  }, [fabricCanvasRef, onAutoSave]);

  // Redo (Undo 스택에서 복원)
  const handleRedo = useCallback(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;
    if (undoStackRef.current.length === 0) return;

    const objToRestore = undoStackRef.current.pop();
    if (objToRestore) {
      lastActionRef.current = "redo";
      fabricCanvas.add(objToRestore);
      fabricCanvas.renderAll();
      onAutoSave();
    }
  }, [fabricCanvasRef, onAutoSave]);

  // Clear
  const handleClear = useCallback(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    undoStackRef.current = [];
    lastActionRef.current = null;

    try {
      const lowerCanvas = (fabricCanvas as any).lowerCanvasEl;
      if (lowerCanvas && lowerCanvas.getContext && lowerCanvas.isConnected !== false) {
        const ctx = lowerCanvas.getContext("2d");
        if (ctx) {
          fabricCanvas.clear();
          fabricCanvas.renderAll();
          onAutoSave();
        }
      }
    } catch (e) {
      log.warn("캔버스 클리어 스킵 - 컨텍스트 사용 불가");
    }
  }, [fabricCanvasRef, onAutoSave]);

  return {
    handleUndo,
    handleRedo,
    handleClear,
    undoStackRef,
    resetStack,
  };
}

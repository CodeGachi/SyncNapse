/**
 * useCanvasUndoRedo 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasUndoRedo } from "@/features/note/drawing/use-canvas-undo-redo";

// Mock fabric.Canvas
const createMockCanvas = () => {
  const objects: any[] = [];

  return {
    getObjects: vi.fn(() => objects),
    add: vi.fn((obj: any) => objects.push(obj)),
    remove: vi.fn((obj: any) => {
      const index = objects.indexOf(obj);
      if (index > -1) objects.splice(index, 1);
    }),
    clear: vi.fn(() => objects.length = 0),
    renderAll: vi.fn(),
    lowerCanvasEl: {
      getContext: vi.fn(() => ({})),
      isConnected: true,
    },
    _objects: objects,
  };
};

describe("useCanvasUndoRedo", () => {
  let mockCanvas: ReturnType<typeof createMockCanvas>;
  let mockOnAutoSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    mockOnAutoSave = vi.fn();
    vi.clearAllMocks();
  });

  describe("handleUndo", () => {
    it("캔버스가 null이면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: null,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleUndo();
      });

      expect(mockOnAutoSave).not.toHaveBeenCalled();
    });

    it("객체가 없으면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleUndo();
      });

      expect(mockCanvas.remove).not.toHaveBeenCalled();
      expect(mockOnAutoSave).not.toHaveBeenCalled();
    });

    it("가장 최근 객체(createdAt 기준) 삭제", () => {
      const obj1 = { id: "obj1", createdAt: 1000 };
      const obj2 = { id: "obj2", createdAt: 2000 };
      const obj3 = { id: "obj3", createdAt: 1500 };

      mockCanvas._objects.push(obj1, obj2, obj3);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleUndo();
      });

      expect(mockCanvas.remove).toHaveBeenCalledWith(obj2);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
      expect(mockOnAutoSave).toHaveBeenCalled();
    });

    it("삭제된 객체를 undo 스택에 저장", () => {
      const obj1 = { id: "obj1", createdAt: 1000 };
      mockCanvas._objects.push(obj1);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.undoStackRef.current).toContain(obj1);
    });

    it("createdAt이 없는 객체는 0으로 처리", () => {
      const obj1 = { id: "obj1" }; // createdAt 없음
      const obj2 = { id: "obj2", createdAt: 100 };

      mockCanvas._objects.push(obj1, obj2);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleUndo();
      });

      // obj2가 더 최근이므로 삭제
      expect(mockCanvas.remove).toHaveBeenCalledWith(obj2);
    });
  });

  describe("handleRedo", () => {
    it("캔버스가 null이면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: null,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleRedo();
      });

      expect(mockOnAutoSave).not.toHaveBeenCalled();
    });

    it("undo 스택이 비어있으면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleRedo();
      });

      expect(mockCanvas.add).not.toHaveBeenCalled();
      expect(mockOnAutoSave).not.toHaveBeenCalled();
    });

    it("undo 스택에서 객체 복원", () => {
      const obj1 = { id: "obj1", createdAt: 1000 };
      mockCanvas._objects.push(obj1);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      // 먼저 Undo
      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.undoStackRef.current).toHaveLength(1);

      // Redo
      act(() => {
        result.current.handleRedo();
      });

      expect(mockCanvas.add).toHaveBeenCalledWith(obj1);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
      expect(result.current.undoStackRef.current).toHaveLength(0);
    });
  });

  describe("handleClear", () => {
    it("캔버스가 null이면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: null,
          onAutoSave: mockOnAutoSave,
        })
      );

      act(() => {
        result.current.handleClear();
      });

      expect(mockOnAutoSave).not.toHaveBeenCalled();
    });

    it("캔버스 클리어하고 스택 초기화", () => {
      const obj1 = { id: "obj1", createdAt: 1000 };
      mockCanvas._objects.push(obj1);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      // Undo로 스택에 객체 추가
      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.undoStackRef.current).toHaveLength(1);

      // Clear
      act(() => {
        result.current.handleClear();
      });

      expect(mockCanvas.clear).toHaveBeenCalled();
      expect(mockCanvas.renderAll).toHaveBeenCalled();
      expect(mockOnAutoSave).toHaveBeenCalled();
      expect(result.current.undoStackRef.current).toHaveLength(0);
    });
  });

  describe("resetStack", () => {
    it("스택 초기화", () => {
      const obj1 = { id: "obj1", createdAt: 1000 };
      mockCanvas._objects.push(obj1);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      // Undo로 스택에 객체 추가
      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.undoStackRef.current).toHaveLength(1);

      // Reset
      act(() => {
        result.current.resetStack();
      });

      expect(result.current.undoStackRef.current).toHaveLength(0);
    });
  });

  describe("Undo/Redo 연속 동작", () => {
    it("여러 번 Undo 후 Redo", () => {
      const obj1 = { id: "obj1", createdAt: 1000 };
      const obj2 = { id: "obj2", createdAt: 2000 };
      const obj3 = { id: "obj3", createdAt: 3000 };

      mockCanvas._objects.push(obj1, obj2, obj3);

      const { result } = renderHook(() =>
        useCanvasUndoRedo({
          fabricCanvas: mockCanvas as any,
          onAutoSave: mockOnAutoSave,
        })
      );

      // Undo 3번
      act(() => {
        result.current.handleUndo();
        result.current.handleUndo();
        result.current.handleUndo();
      });

      expect(result.current.undoStackRef.current).toHaveLength(3);
      expect(mockCanvas._objects).toHaveLength(0);

      // Redo 2번
      act(() => {
        result.current.handleRedo();
        result.current.handleRedo();
      });

      expect(result.current.undoStackRef.current).toHaveLength(1);
      expect(mockCanvas._objects).toHaveLength(2);
    });
  });
});

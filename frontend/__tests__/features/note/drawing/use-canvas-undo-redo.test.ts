/**
 * useCanvasUndoRedo 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasUndoRedo } from "@/features/note/drawing/use-canvas-undo-redo";

beforeEach(() => { vi.clearAllMocks(); });

describe("useCanvasUndoRedo", () => {
  const createMockCanvas = () => {
    const objects: any[] = [];
    return {
      getObjects: vi.fn(() => objects),
      add: vi.fn((obj: any) => objects.push(obj)),
      remove: vi.fn((obj: any) => { const i = objects.indexOf(obj); if (i > -1) objects.splice(i, 1); }),
      clear: vi.fn(() => objects.length = 0),
      renderAll: vi.fn(),
      _objects: objects,
    };
  };

  it("캔버스 없으면 아무것도 안함", () => {
    const onAutoSave = vi.fn();
    const { result } = renderHook(() => useCanvasUndoRedo({ fabricCanvas: null, onAutoSave }));
    act(() => { result.current.handleUndo(); });
    expect(onAutoSave).not.toHaveBeenCalled();
  });

  it("handleUndo로 객체 삭제", () => {
    const canvas = createMockCanvas();
    canvas._objects.push({ id: "obj1", createdAt: 1000 });
    const onAutoSave = vi.fn();
    const { result } = renderHook(() => useCanvasUndoRedo({ fabricCanvas: canvas as any, onAutoSave }));
    act(() => { result.current.handleUndo(); });
    expect(canvas.remove).toHaveBeenCalled();
    expect(onAutoSave).toHaveBeenCalled();
  });

  it("handleRedo로 객체 복원", () => {
    const canvas = createMockCanvas();
    canvas._objects.push({ id: "obj1", createdAt: 1000 });
    const { result } = renderHook(() => useCanvasUndoRedo({ fabricCanvas: canvas as any, onAutoSave: vi.fn() }));
    act(() => { result.current.handleUndo(); });
    act(() => { result.current.handleRedo(); });
    expect(canvas.add).toHaveBeenCalled();
  });
});

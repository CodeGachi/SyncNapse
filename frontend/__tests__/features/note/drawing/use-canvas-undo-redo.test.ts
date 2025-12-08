import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCanvasUndoRedo } from "@/features/note/drawing/use-canvas-undo-redo";

describe("useCanvasUndoRedo", () => {
  it("handleUndo 함수 반환", () => {
    const fabricCanvasRef = { current: null };
    const { result } = renderHook(() => useCanvasUndoRedo({ fabricCanvasRef, onAutoSave: vi.fn() }));
    expect(typeof result.current.handleUndo).toBe("function");
    expect(typeof result.current.handleRedo).toBe("function");
  });
});

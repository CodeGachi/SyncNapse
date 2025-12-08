/**
 * useDrawingTools 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDrawingTools } from "@/features/note/drawing/use-drawing-tools";

vi.mock("@/stores/draw-store", () => ({
  useDrawStore: vi.fn(() => ({ type: "pen", lineColor: "#000000", lineWidth: 2 })),
}));
vi.mock("@/features/note/drawing/shapes", () => ({
  createShapeByDrag: vi.fn(() => ({ selectable: true, evented: true, opacity: 1, set: vi.fn() })),
}));
vi.mock("fabric", () => ({ PencilBrush: vi.fn(() => ({ color: "", width: 1 })) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("useDrawingTools", () => {
  it("canvas 없으면 초기 상태", () => {
    const fabricCanvasRef = { current: null };
    const undoStackRef = { current: [] };
    const onAutoSave = vi.fn();

    const { result } = renderHook(() => useDrawingTools({
      fabricCanvasRef,
      isDrawingMode: false,
      isEnabled: false,
      pdfScale: 1,
      undoStackRef,
      onAutoSave,
    }));
    expect(result.current).toBeUndefined();
  });

  it("canvas 있으면 훅 동작", () => {
    const mockCanvas = {
      isDrawingMode: false,
      freeDrawingBrush: null,
      renderAll: vi.fn(),
      add: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      forEachObject: vi.fn(),
    };
    const fabricCanvasRef = { current: mockCanvas };
    const undoStackRef = { current: [] };
    const onAutoSave = vi.fn();

    renderHook(() => useDrawingTools({
      fabricCanvasRef: fabricCanvasRef as any,
      isDrawingMode: true,
      isEnabled: true,
      pdfScale: 1,
      undoStackRef,
      onAutoSave,
    }));
    // 에러 없이 실행되면 성공
  });
});

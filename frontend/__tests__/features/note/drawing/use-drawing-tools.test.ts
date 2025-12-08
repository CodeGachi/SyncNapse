import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/stores/draw-store", () => ({
  useDrawStore: () => ({ type: "pen", lineColor: "#000000", lineWidth: 2 }),
}));
vi.mock("@/features/note/drawing/shapes", () => ({
  createShapeByDrag: vi.fn(),
}));
vi.mock("fabric", () => ({ PencilBrush: vi.fn() }));

import { useDrawingTools } from "@/features/note/drawing/use-drawing-tools";

describe("useDrawingTools", () => {
  it("canvas 없으면 undefined", () => {
    const { result } = renderHook(() => useDrawingTools({
      fabricCanvasRef: { current: null },
      isDrawingMode: false,
      isEnabled: false,
      pdfScale: 1,
      undoStackRef: { current: [] },
      onAutoSave: vi.fn(),
    }));
    expect(result.current).toBeUndefined();
  });
});

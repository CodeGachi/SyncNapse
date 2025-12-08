import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/db/drawings", () => ({ getDrawing: vi.fn() }));

import { useDrawingPageData } from "@/features/note/drawing/use-drawing-page-data";

describe("useDrawingPageData", () => {
  it("초기 상태", () => {
    const fabricCanvasRef = { current: null };
    const { result } = renderHook(() => useDrawingPageData({
      fabricCanvasRef,
      noteId: "note-1",
      pageNum: 1,
      isCollaborative: false,
      isCanvasReady: false,
    }));
    expect(result.current.isLoading).toBe(true);
  });
});

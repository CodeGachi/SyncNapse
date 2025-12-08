/**
 * useDrawingSave 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDrawingSave } from "@/features/note/drawing/use-drawing-save";
import { saveDrawing } from "@/lib/db/drawings";
import type { DrawingData } from "@/lib/types/drawing";

vi.mock("@/lib/db/drawings", () => ({ saveDrawing: vi.fn() }));
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

describe("useDrawingSave", () => {
  const mockDrawingData: DrawingData = {
    id: "drawing-123",
    noteId: "note-1",
    fileId: "file-1",
    pageNum: 1,
    canvas: { objects: [], version: "5.3.0" },
    image: "data:image/png;base64,test",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => vi.clearAllMocks());

  it("드로잉 저장 및 에러 처리", async () => {
    vi.mocked(saveDrawing).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDrawingSave({ fileId: "file-1", pageNum: 1 }));

    expect(typeof result.current.handleDrawingSave).toBe("function");

    await act(async () => await result.current.handleDrawingSave(mockDrawingData));
    expect(saveDrawing).toHaveBeenCalledWith(mockDrawingData);

    // 에러 시에도 throw 안함
    vi.mocked(saveDrawing).mockRejectedValue(new Error("DB error"));
    await act(async () => await result.current.handleDrawingSave(mockDrawingData));
    expect(saveDrawing).toHaveBeenCalled();
  });

  it("props 변경시 새로운 콜백 생성", () => {
    vi.mocked(saveDrawing).mockResolvedValue(undefined);
    const { result, rerender } = renderHook((props) => useDrawingSave(props), {
      initialProps: { fileId: "file-1", pageNum: 1 },
    });

    const first = result.current.handleDrawingSave;
    rerender({ fileId: "file-2", pageNum: 1 });
    expect(result.current.handleDrawingSave).not.toBe(first);

    const second = result.current.handleDrawingSave;
    rerender({ fileId: "file-2", pageNum: 2 });
    expect(result.current.handleDrawingSave).not.toBe(second);
  });
});

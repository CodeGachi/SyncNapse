/**
 * useDrawingSave 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDrawingSave } from "@/features/note/drawing/use-drawing-save";
import { saveDrawing } from "@/lib/db/drawings";
import type { DrawingData } from "@/lib/types/drawing";

// Mock dependencies
vi.mock("@/lib/db/drawings", () => ({
  saveDrawing: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useDrawingSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleDrawingSave", () => {
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

    it("드로잉 데이터를 IndexedDB에 저장", async () => {
      vi.mocked(saveDrawing).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useDrawingSave({ fileId: "file-1", pageNum: 1 })
      );

      await act(async () => {
        await result.current.handleDrawingSave(mockDrawingData);
      });

      expect(saveDrawing).toHaveBeenCalledWith(mockDrawingData);
    });

    it("저장 실패시 에러 로깅 (throw 안함)", async () => {
      vi.mocked(saveDrawing).mockRejectedValue(new Error("DB error"));

      const { result } = renderHook(() =>
        useDrawingSave({ fileId: "file-1", pageNum: 1 })
      );

      // 에러가 throw 되지 않아야 함
      await act(async () => {
        await result.current.handleDrawingSave(mockDrawingData);
      });

      expect(saveDrawing).toHaveBeenCalled();
    });

    it("fileId가 없어도 저장 가능", async () => {
      vi.mocked(saveDrawing).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useDrawingSave({ pageNum: 2 })
      );

      await act(async () => {
        await result.current.handleDrawingSave(mockDrawingData);
      });

      expect(saveDrawing).toHaveBeenCalledWith(mockDrawingData);
    });
  });

  describe("반환값", () => {
    it("handleDrawingSave 함수 반환", () => {
      const { result } = renderHook(() =>
        useDrawingSave({ fileId: "file-1", pageNum: 1 })
      );

      expect(result.current).toHaveProperty("handleDrawingSave");
      expect(typeof result.current.handleDrawingSave).toBe("function");
    });
  });

  describe("props 변경", () => {
    it("fileId 변경시 새로운 콜백 생성", async () => {
      vi.mocked(saveDrawing).mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        (props) => useDrawingSave(props),
        {
          initialProps: { fileId: "file-1", pageNum: 1 },
        }
      );

      const firstCallback = result.current.handleDrawingSave;

      rerender({ fileId: "file-2", pageNum: 1 });

      const secondCallback = result.current.handleDrawingSave;

      // 콜백이 새로 생성됨
      expect(firstCallback).not.toBe(secondCallback);
    });

    it("pageNum 변경시 새로운 콜백 생성", async () => {
      vi.mocked(saveDrawing).mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        (props) => useDrawingSave(props),
        {
          initialProps: { fileId: "file-1", pageNum: 1 },
        }
      );

      const firstCallback = result.current.handleDrawingSave;

      rerender({ fileId: "file-1", pageNum: 2 });

      const secondCallback = result.current.handleDrawingSave;

      // 콜백이 새로 생성됨
      expect(firstCallback).not.toBe(secondCallback);
    });
  });
});

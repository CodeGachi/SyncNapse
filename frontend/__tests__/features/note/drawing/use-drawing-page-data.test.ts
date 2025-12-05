/**
 * useDrawingPageData 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDrawingPageData } from "@/features/note/drawing/use-drawing-page-data";
import { getDrawing } from "@/lib/db/drawings";

// Mock dependencies
vi.mock("@/lib/db/drawings", () => ({
  getDrawing: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock Fabric Canvas
function createMockFabricCanvas() {
  return {
    clear: vi.fn(),
    renderAll: vi.fn(),
    loadFromJSON: vi.fn((json: any, callback: () => void) => {
      callback();
    }),
    toJSON: vi.fn(() => ({ objects: [], version: "5.3.0" })),
    toDataURL: vi.fn(() => "data:image/png;base64,test"),
    lowerCanvasEl: {
      getContext: vi.fn(() => ({})),
      isConnected: true,
    },
  };
}

describe("useDrawingPageData", () => {
  let mockCanvas: ReturnType<typeof createMockFabricCanvas>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = createMockFabricCanvas();
    vi.mocked(getDrawing).mockResolvedValue(null);
  });

  describe("초기 상태", () => {
    it("로딩 상태로 시작", async () => {
      const { result } = renderHook(() =>
        useDrawingPageData({
          fabricCanvas: mockCanvas as any,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: false,
        })
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("페이지 데이터 로드", () => {
    it("비협업 모드에서 IndexedDB 데이터 로드", async () => {
      const mockDrawingData = {
        canvas: { objects: [{ type: "path" }] },
      };
      vi.mocked(getDrawing).mockResolvedValue(mockDrawingData);

      renderHook(() =>
        useDrawingPageData({
          fabricCanvas: mockCanvas as any,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: false,
        })
      );

      await waitFor(() => {
        expect(getDrawing).toHaveBeenCalledWith("note-1", "file-1", 1);
      });
    });

    it("협업 모드에서는 IndexedDB 로드 스킵", async () => {
      renderHook(() =>
        useDrawingPageData({
          fabricCanvas: mockCanvas as any,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: true,
        })
      );

      // 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(getDrawing).not.toHaveBeenCalled();
    });

    it("canvas가 없으면 로드 스킵", async () => {
      renderHook(() =>
        useDrawingPageData({
          fabricCanvas: null,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: false,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(getDrawing).not.toHaveBeenCalled();
    });
  });

  describe("자동 저장", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("triggerAutoSave 호출시 디바운스로 저장", async () => {
      vi.useRealTimers();
      const onSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useDrawingPageData({
          fabricCanvas: mockCanvas as any,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: false,
          onSave,
        })
      );

      // 로딩 완료 대기
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.triggerAutoSave();
      });

      // 디바운스 시간 전에는 저장 안됨
      expect(onSave).not.toHaveBeenCalled();

      // 디바운스 시간 경과 대기
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(onSave).toHaveBeenCalled();
      expect(mockCanvas.toJSON).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });

    it("협업 모드에서 syncToStorage 호출", async () => {
      vi.useRealTimers();
      const syncToStorage = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useDrawingPageData({
          fabricCanvas: mockCanvas as any,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: true,
          onSave,
          syncToStorage,
        })
      );

      act(() => {
        result.current.triggerAutoSave();
      });

      // 디바운스 대기
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(syncToStorage).toHaveBeenCalledWith(mockCanvas);
    });
  });

  describe("반환값", () => {
    it("필요한 모든 값과 함수 반환", () => {
      const { result } = renderHook(() =>
        useDrawingPageData({
          fabricCanvas: mockCanvas as any,
          noteId: "note-1",
          fileId: "file-1",
          pageNum: 1,
          isCollaborative: false,
        })
      );

      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("triggerAutoSave");
      expect(result.current).toHaveProperty("resetUndoStack");
      expect(typeof result.current.triggerAutoSave).toBe("function");
      expect(typeof result.current.resetUndoStack).toBe("function");
    });
  });
});

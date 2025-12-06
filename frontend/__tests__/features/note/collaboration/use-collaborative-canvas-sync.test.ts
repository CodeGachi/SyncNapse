/**
 * use-collaborative-canvas-sync 테스트
 * 실시간 캔버스 동기화 훅
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock Liveblocks
const mockMutation = vi.fn();

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
  useMutation: vi.fn(() => mockMutation),
  useStatus: vi.fn(() => "connected"),
  getCanvasKey: vi.fn((fileId: string, pageNum: number) => `${fileId}_page-${pageNum}`),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useStorage, useStatus } from "@/lib/liveblocks/liveblocks.config";
import { useCollaborativeCanvasSync } from "@/features/note/collaboration/use-collaborative-canvas-sync";

// Mock Fabric.js Canvas
const createMockCanvas = () => ({
  toJSON: vi.fn(() => ({ objects: [] })),
  loadFromJSON: vi.fn().mockResolvedValue(undefined),
  renderAll: vi.fn(),
  clear: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

describe("useCollaborativeCanvasSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 상태", () => {
    it("비활성화 상태에서 기본값", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: false,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasPendingChanges).toBe(false);
      expect(result.current.connectionStatus).toBe("connected");
    });
  });

  describe("연결 상태", () => {
    it("connected 상태 반환", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: true,
        })
      );

      expect(result.current.connectionStatus).toBe("connected");
    });

    it("disconnected 상태 반환", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("disconnected");

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: true,
        })
      );

      expect(result.current.connectionStatus).toBe("disconnected");
    });

    it("연결 상태 변경 콜백", () => {
      const onConnectionChange = vi.fn();
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connecting");

      renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: true,
          onConnectionChange,
        })
      );

      expect(onConnectionChange).toHaveBeenCalledWith("connecting");
    });
  });

  describe("syncToStorage", () => {
    it("비활성화 상태에서 동기화 스킵", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: mockCanvas as any,
          isEnabled: false,
        })
      );

      result.current.syncToStorage(mockCanvas as any);

      expect(mockCanvas.toJSON).not.toHaveBeenCalled();
    });

    it("readOnly 모드에서 동기화 스킵", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: mockCanvas as any,
          isEnabled: true,
          readOnly: true,
        })
      );

      result.current.syncToStorage(mockCanvas as any);

      expect(mockCanvas.toJSON).not.toHaveBeenCalled();
    });

    it("캔버스 없으면 동기화 스킵", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: true,
        })
      );

      // null canvas로 호출
      result.current.syncToStorage(null as any);

      expect(mockMutation).not.toHaveBeenCalled();
    });
  });

  describe("clearError", () => {
    it("에러 상태 초기화", async () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: true,
        })
      );

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("retryPendingChanges", () => {
    it("연결됨 + pending 변경사항 있으면 재시도", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");

      const { result } = renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: null,
          isEnabled: true,
        })
      );

      // pending 변경사항이 없으므로 아무것도 안함
      act(() => {
        result.current.retryPendingChanges();
      });

      // pending이 없으므로 mutation 호출 안됨
      expect(result.current.hasPendingChanges).toBe(false);
    });
  });

  describe("캔버스 이벤트 리스너", () => {
    it("활성화 + 캔버스 있으면 이벤트 리스너 등록", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");
      const mockCanvas = createMockCanvas();

      renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: mockCanvas as any,
          isEnabled: true,
          readOnly: false,
        })
      );

      expect(mockCanvas.on).toHaveBeenCalledWith("object:added", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("object:modified", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("object:removed", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("path:created", expect.any(Function));
    });

    it("readOnly 모드에서 이벤트 리스너 미등록", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");
      const mockCanvas = createMockCanvas();

      renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: mockCanvas as any,
          isEnabled: true,
          readOnly: true,
        })
      );

      expect(mockCanvas.on).not.toHaveBeenCalled();
    });

    it("비활성화 상태에서 이벤트 리스너 미등록", () => {
      (useStorage as any).mockReturnValue(null);
      (useStatus as any).mockReturnValue("connected");
      const mockCanvas = createMockCanvas();

      renderHook(() =>
        useCollaborativeCanvasSync({
          fileId: "file-1",
          pageNum: 1,
          fabricCanvas: mockCanvas as any,
          isEnabled: false,
        })
      );

      expect(mockCanvas.on).not.toHaveBeenCalled();
    });
  });

  describe("페이지 변경", () => {
    it("페이지 변경 시 캔버스 클리어", () => {
      const canvasData = {
        "file-1_page-1": { objects: [{ type: "rect" }] },
      };
      (useStorage as any).mockReturnValue(canvasData);
      (useStatus as any).mockReturnValue("connected");
      const mockCanvas = createMockCanvas();

      const { rerender } = renderHook(
        ({ pageNum }) =>
          useCollaborativeCanvasSync({
            fileId: "file-1",
            pageNum,
            fabricCanvas: mockCanvas as any,
            isEnabled: true,
          }),
        { initialProps: { pageNum: 1 } }
      );

      // 페이지 변경
      rerender({ pageNum: 2 });

      expect(mockCanvas.clear).toHaveBeenCalled();
    });
  });
});

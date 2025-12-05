/**
 * useDrawingTools 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDrawingTools } from "@/features/note/drawing/use-drawing-tools";

// Mock draw store
const mockDrawStore = {
  type: "pen",
  lineColor: "#000000",
  lineWidth: 2,
};

vi.mock("@/stores/draw-store", () => ({
  useDrawStore: vi.fn(() => mockDrawStore),
}));

// Mock shapes module
vi.mock("@/features/note/drawing/shapes", () => ({
  createShapeByDrag: vi.fn(() => ({
    selectable: true,
    evented: true,
    opacity: 1,
    set: vi.fn(),
  })),
}));

// Mock Fabric.js
vi.mock("fabric", () => ({
  PencilBrush: vi.fn(() => ({
    color: "",
    width: 1,
  })),
}));

// Mock Fabric Canvas
function createMockFabricCanvas() {
  const eventHandlers: Record<string, Function[]> = {};

  return {
    isDrawingMode: false,
    freeDrawingBrush: null as any,
    renderAll: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    setActiveObject: vi.fn(),
    getPointer: vi.fn(() => ({ x: 100, y: 100 })),
    forEachObject: vi.fn((callback: (obj: any) => void) => {
      // 기본적으로 빈 배열이지만 테스트용 객체 추가 가능
    }),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
      }
    }),
    // 테스트 헬퍼
    _trigger: (event: string, data?: any) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((handler) => handler(data));
      }
    },
    _getHandlerCount: (event: string) => eventHandlers[event]?.length || 0,
  };
}

describe("useDrawingTools", () => {
  let mockCanvas: ReturnType<typeof createMockFabricCanvas>;
  const mockUndoStackRef = { current: [] as any[] };
  const mockOnAutoSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = createMockFabricCanvas();
    mockUndoStackRef.current = [];

    // Reset store state
    mockDrawStore.type = "pen";
    mockDrawStore.lineColor = "#000000";
    mockDrawStore.lineWidth = 2;
  });

  describe("펜 모드", () => {
    it("펜 모드에서 isDrawingMode true 설정", () => {
      mockDrawStore.type = "pen";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.isDrawingMode).toBe(true);
    });

    it("펜 모드가 아니면 isDrawingMode false 설정", () => {
      mockDrawStore.type = "hand";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.isDrawingMode).toBe(false);
    });

    it("형광펜 모드에서도 isDrawingMode true 설정", () => {
      mockDrawStore.type = "highlighter";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.isDrawingMode).toBe(true);
    });
  });

  describe("지우개 모드", () => {
    it("지우개 모드에서 이벤트 핸들러 등록", () => {
      mockDrawStore.type = "eraser";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:down", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:move", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:up", expect.any(Function));
    });

    it("지우개 모드에서 객체 selectable false 설정", () => {
      mockDrawStore.type = "eraser";
      const mockObject = { selectable: true, evented: true };

      mockCanvas.forEachObject = vi.fn((callback: (obj: any) => void) => {
        callback(mockObject);
      });

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockObject.selectable).toBe(false);
      expect(mockObject.evented).toBe(true);
    });
  });

  describe("도형 모드", () => {
    it("solidLine 모드에서 이벤트 핸들러 등록", () => {
      mockDrawStore.type = "solidLine";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:down", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:move", expect.any(Function));
      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:up", expect.any(Function));
    });

    it("rect 모드에서 이벤트 핸들러 등록", () => {
      mockDrawStore.type = "rect";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:down", expect.any(Function));
    });

    it("circle 모드에서 이벤트 핸들러 등록", () => {
      mockDrawStore.type = "circle";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.on).toHaveBeenCalledWith("mouse:down", expect.any(Function));
    });
  });

  describe("선택 모드 (hand)", () => {
    it("hand 모드에서 객체 selectable true 설정", () => {
      mockDrawStore.type = "hand";
      const mockObject = { selectable: false, evented: false };

      mockCanvas.forEachObject = vi.fn((callback: (obj: any) => void) => {
        callback(mockObject);
      });

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockObject.selectable).toBe(true);
      expect(mockObject.evented).toBe(true);
    });
  });

  describe("path:created 이벤트", () => {
    it("펜 모드에서 path:created 이벤트 등록", () => {
      mockDrawStore.type = "pen";

      renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      expect(mockCanvas.on).toHaveBeenCalledWith("path:created", expect.any(Function));
    });
  });

  describe("canvas가 없는 경우", () => {
    it("canvas가 null이면 아무것도 하지 않음", () => {
      renderHook(() =>
        useDrawingTools({
          fabricCanvas: null,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      // 에러 없이 실행됨
    });
  });

  describe("isDrawingMode false", () => {
    it("isDrawingMode가 false면 이벤트 등록 안함", () => {
      mockDrawStore.type = "eraser";

      const { result } = renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: false,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      // mouse:down 이벤트는 등록되지 않아야 함 (지우개/도형 이벤트)
      const mouseDownCalls = (mockCanvas.on as any).mock.calls.filter(
        (call: any[]) => call[0] === "mouse:down"
      );
      expect(mouseDownCalls.length).toBe(0);
    });
  });

  describe("클린업", () => {
    it("언마운트시 이벤트 핸들러 제거", () => {
      mockDrawStore.type = "eraser";

      const { unmount } = renderHook(() =>
        useDrawingTools({
          fabricCanvas: mockCanvas as any,
          isDrawingMode: true,
          isEnabled: true,
          pdfScale: 1,
          undoStackRef: mockUndoStackRef,
          onAutoSave: mockOnAutoSave,
        })
      );

      unmount();

      expect(mockCanvas.off).toHaveBeenCalled();
    });
  });
});

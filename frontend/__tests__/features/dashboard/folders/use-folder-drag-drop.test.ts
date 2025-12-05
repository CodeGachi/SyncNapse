/**
 * useFolderDragDrop 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFolderDragDrop } from "@/features/dashboard/folders/use-folder-drag-drop";

// Mock APIs
vi.mock("@/lib/api/services/folders.api", () => ({
  moveFolder: vi.fn(),
}));

vi.mock("@/lib/api/services/notes.api", () => ({
  updateNote: vi.fn(),
}));

// Import mocked functions
import { moveFolder } from "@/lib/api/services/folders.api";
import { updateNote } from "@/lib/api/services/notes.api";

describe("useFolderDragDrop", () => {
  let mockDispatchEvent: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock window.dispatchEvent
    mockDispatchEvent = vi.fn();
    vi.spyOn(window, "dispatchEvent").mockImplementation(mockDispatchEvent);

    // Mock window.location.reload
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  describe("초기 상태", () => {
    it("draggedItem이 null로 시작", () => {
      const { result } = renderHook(() => useFolderDragDrop());
      expect(result.current.draggedItem).toBe(null);
    });

    it("dragOverItem이 null로 시작", () => {
      const { result } = renderHook(() => useFolderDragDrop());
      expect(result.current.dragOverItem).toBe(null);
    });
  });

  describe("handleDragStart", () => {
    it("폴더 드래그 시작", () => {
      const { result } = renderHook(() => useFolderDragDrop());

      const mockEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(mockEvent, "folder", "folder-1");
      });

      expect(result.current.draggedItem).toEqual({ type: "folder", id: "folder-1" });
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEvent.dataTransfer.effectAllowed).toBe("move");
    });

    it("노트 드래그 시작", () => {
      const { result } = renderHook(() => useFolderDragDrop());

      const mockEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(mockEvent, "note", "note-1");
      });

      expect(result.current.draggedItem).toEqual({ type: "note", id: "note-1" });
    });
  });

  describe("handleDragOver", () => {
    it("다른 폴더 위에서 드래그 오버", () => {
      const { result } = renderHook(() => useFolderDragDrop());

      // 먼저 드래그 시작
      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      // 다른 폴더 위에서 드래그 오버
      const overEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(overEvent, "folder", "folder-2");
      });

      expect(result.current.dragOverItem).toEqual({ type: "folder", id: "folder-2" });
      expect(overEvent.preventDefault).toHaveBeenCalled();
      expect(overEvent.stopPropagation).toHaveBeenCalled();
    });

    it("같은 아이템 위에서 드래그 오버하면 dragOverItem 설정 안함", () => {
      const { result } = renderHook(() => useFolderDragDrop());

      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      const overEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(overEvent, "folder", "folder-1");
      });

      expect(result.current.dragOverItem).toBe(null);
    });
  });

  describe("handleDragLeave", () => {
    it("드래그 리브 시 dragOverItem 초기화", () => {
      const { result } = renderHook(() => useFolderDragDrop());

      // 드래그 시작 및 오버
      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      const overEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(overEvent, "folder", "folder-2");
      });

      expect(result.current.dragOverItem).not.toBe(null);

      // 드래그 리브
      const leaveEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragLeave(leaveEvent);
      });

      expect(result.current.dragOverItem).toBe(null);
    });
  });

  describe("handleDrop", () => {
    it("폴더를 다른 폴더에 드롭하면 moveFolder 호출", async () => {
      vi.mocked(moveFolder).mockResolvedValue({} as any);

      const { result } = renderHook(() => useFolderDragDrop());

      // 폴더 드래그 시작
      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      // 다른 폴더에 드롭
      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "folder", "folder-2");
      });

      expect(moveFolder).toHaveBeenCalledWith("folder-1", "folder-2");
      expect(result.current.draggedItem).toBe(null);
      expect(result.current.dragOverItem).toBe(null);
    });

    it("노트를 폴더에 드롭하면 updateNote 호출", async () => {
      vi.mocked(updateNote).mockResolvedValue({} as any);

      const { result } = renderHook(() => useFolderDragDrop());

      // 노트 드래그 시작
      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "note", "note-1");
      });

      // 폴더에 드롭
      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "folder", "folder-1");
      });

      expect(updateNote).toHaveBeenCalledWith("note-1", { folderId: "folder-1" });
    });

    it("같은 아이템에 드롭하면 아무것도 하지 않음", async () => {
      const { result } = renderHook(() => useFolderDragDrop());

      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "folder", "folder-1");
      });

      expect(moveFolder).not.toHaveBeenCalled();
      expect(updateNote).not.toHaveBeenCalled();
    });

    it("노트에 드롭하면 이동하지 않음 (폴더만 허용)", async () => {
      const { result } = renderHook(() => useFolderDragDrop());

      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "note", "note-1");
      });

      expect(moveFolder).not.toHaveBeenCalled();
    });

    it("draggedItem이 없으면 아무것도 하지 않음", async () => {
      const { result } = renderHook(() => useFolderDragDrop());

      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "folder", "folder-1");
      });

      expect(moveFolder).not.toHaveBeenCalled();
      expect(updateNote).not.toHaveBeenCalled();
    });

    it("드롭 성공 시 커스텀 이벤트 발생", async () => {
      vi.mocked(moveFolder).mockResolvedValue({} as any);

      const { result } = renderHook(() => useFolderDragDrop());

      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "folder", "folder-2");
      });

      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });

    it("API 호출 실패 시 alert 표시", async () => {
      vi.mocked(moveFolder).mockRejectedValue(new Error("Failed"));
      const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { result } = renderHook(() => useFolderDragDrop());

      const startEvent = {
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: "" },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragStart(startEvent, "folder", "folder-1");
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.DragEvent;

      await act(async () => {
        await result.current.handleDrop(dropEvent, "folder", "folder-2");
      });

      expect(mockAlert).toHaveBeenCalledWith("이동에 실패했습니다. 다시 시도해주세요.");
      mockAlert.mockRestore();
    });
  });
});

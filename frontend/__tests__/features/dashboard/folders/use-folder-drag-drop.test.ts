/**
 * useFolderDragDrop 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFolderDragDrop } from "@/features/dashboard/folders/use-folder-drag-drop";

vi.mock("@/lib/api/services/folders.api", () => ({ moveFolder: vi.fn() }));
vi.mock("@/lib/api/services/notes.api", () => ({ updateNote: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); });

describe("useFolderDragDrop", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useFolderDragDrop({ folders: [], onRefresh: vi.fn() }));
    expect(result.current.draggedItem).toBeNull();
    expect(result.current.dropTargetId).toBeNull();
  });

  it("드래그 시작", () => {
    const { result } = renderHook(() => useFolderDragDrop({ folders: [], onRefresh: vi.fn() }));
    act(() => { result.current.handleDragStart({ id: "folder-1", type: "folder", name: "Test" }); });
    expect(result.current.draggedItem).toEqual({ id: "folder-1", type: "folder", name: "Test" });
  });

  it("드래그 끝", () => {
    const { result } = renderHook(() => useFolderDragDrop({ folders: [], onRefresh: vi.fn() }));
    act(() => { result.current.handleDragStart({ id: "folder-1", type: "folder", name: "Test" }); });
    act(() => { result.current.handleDragEnd(); });
    expect(result.current.draggedItem).toBeNull();
  });
});

/**
 * useFilePanelUI 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilePanelUI } from "@/features/note/file/use-file-panel-ui";

beforeEach(() => { vi.clearAllMocks(); });

describe("useFilePanelUI", () => {
  const mockFiles = [{ id: "file-1", name: "test.pdf", type: "application/pdf", size: 1024, uploadedAt: "2024-01-01", url: "blob:test" }];

  it("초기 상태", () => {
    const { result } = renderHook(() => useFilePanelUI({ files: mockFiles, onAddFile: vi.fn(), onRemoveFile: vi.fn() }));
    expect(result.current.contextMenu.visible).toBe(false);
    expect(result.current.focusedFileId).toBeNull();
    expect(result.current.renamingFileId).toBeNull();
  });

  it("handleContextMenu로 메뉴 열기", () => {
    const { result } = renderHook(() => useFilePanelUI({ files: mockFiles, onAddFile: vi.fn(), onRemoveFile: vi.fn() }));
    const mockEvent = { preventDefault: vi.fn(), clientX: 100, clientY: 200 } as any;
    act(() => { result.current.handleContextMenu(mockEvent, "file-1"); });
    expect(result.current.contextMenu.visible).toBe(true);
  });

  it("handleRename으로 이름 변경 시작", () => {
    const { result } = renderHook(() => useFilePanelUI({ files: mockFiles, onAddFile: vi.fn(), onRemoveFile: vi.fn(), onRenameFile: vi.fn() }));
    act(() => { result.current.handleRename("file-1"); });
    expect(result.current.renamingFileId).toBe("file-1");
    expect(result.current.renameValue).toBe("test.pdf");
  });
});

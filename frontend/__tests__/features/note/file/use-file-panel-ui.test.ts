/**
 * useFilePanelUI 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilePanelUI } from "@/features/note/file/use-file-panel-ui";
import type { FileItem } from "@/lib/types";

describe("useFilePanelUI", () => {
  const mockOnAddFile = vi.fn();
  const mockOnRemoveFile = vi.fn();
  const mockOnRenameFile = vi.fn();
  const mockOnCopyFile = vi.fn();

  const defaultFiles: FileItem[] = [
    {
      id: "file-1",
      name: "test.pdf",
      type: "application/pdf",
      size: 1024,
      uploadedAt: "2024-01-01",
      url: "blob:test",
    },
    {
      id: "file-2",
      name: "image.png",
      type: "image/png",
      size: 2048,
      uploadedAt: "2024-01-02",
      url: "blob:image",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기화", () => {
    it("기본 반환값 확인", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      expect(result.current.fileInputRef).toBeDefined();
      expect(result.current.contextMenu.visible).toBe(false);
      expect(result.current.focusedFileId).toBeNull();
      expect(result.current.renamingFileId).toBeNull();
      expect(result.current.renameValue).toBe("");
    });
  });

  describe("handleFileChange", () => {
    it("파일 추가 시 onAddFile 호출", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      const mockFile = new File(["test"], "new.pdf", { type: "application/pdf" });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(mockEvent);
      });

      expect(mockOnAddFile).toHaveBeenCalledWith(mockFile);
    });

    it("여러 파일 동시 추가", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      const mockFiles = [
        new File(["test1"], "file1.pdf", { type: "application/pdf" }),
        new File(["test2"], "file2.pdf", { type: "application/pdf" }),
      ];
      const mockEvent = {
        target: {
          files: mockFiles,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(mockEvent);
      });

      expect(mockOnAddFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("컨텍스트 메뉴", () => {
    it("handleContextMenu로 메뉴 열기", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleContextMenu(mockEvent, "file-1");
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.contextMenu.visible).toBe(true);
      expect(result.current.contextMenu.x).toBe(100);
      expect(result.current.contextMenu.y).toBe(200);
      expect(result.current.contextMenu.fileId).toBe("file-1");
    });
  });

  describe("handleDelete", () => {
    it("파일 삭제 및 컨텍스트 메뉴 닫기", async () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      await act(async () => {
        await result.current.handleDelete("file-1");
      });

      expect(mockOnRemoveFile).toHaveBeenCalledWith("file-1");
      expect(result.current.contextMenu.visible).toBe(false);
    });
  });

  describe("이름 변경", () => {
    it("handleRename으로 이름 변경 시작", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
          onRenameFile: mockOnRenameFile,
        })
      );

      act(() => {
        result.current.handleRename("file-1");
      });

      expect(result.current.renamingFileId).toBe("file-1");
      expect(result.current.renameValue).toBe("test.pdf");
    });

    it("handleRenameSubmit으로 이름 변경 완료", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
          onRenameFile: mockOnRenameFile,
        })
      );

      act(() => {
        result.current.handleRename("file-1");
      });

      act(() => {
        result.current.setRenameValue("renamed.pdf");
      });

      act(() => {
        result.current.handleRenameSubmit("file-1");
      });

      expect(mockOnRenameFile).toHaveBeenCalledWith("file-1", "renamed.pdf");
      expect(result.current.renamingFileId).toBeNull();
    });

    it("handleRenameCancel로 이름 변경 취소", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
          onRenameFile: mockOnRenameFile,
        })
      );

      act(() => {
        result.current.handleRename("file-1");
      });

      act(() => {
        result.current.handleRenameCancel();
      });

      expect(result.current.renamingFileId).toBeNull();
      expect(result.current.renameValue).toBe("");
    });
  });

  describe("handleCopy", () => {
    it("파일 복사 및 컨텍스트 메뉴 닫기", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
          onCopyFile: mockOnCopyFile,
        })
      );

      act(() => {
        result.current.handleCopy("file-1");
      });

      expect(mockOnCopyFile).toHaveBeenCalledWith("file-1");
      expect(result.current.contextMenu.visible).toBe(false);
    });
  });

  describe("handleKeyDown", () => {
    it("Delete 키로 파일 삭제", async () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      const mockEvent = {
        key: "Delete",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      await act(async () => {
        await result.current.handleKeyDown(mockEvent, "file-1");
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockOnRemoveFile).toHaveBeenCalledWith("file-1");
    });

    it("F2 키로 이름 변경 시작", async () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
          onRenameFile: mockOnRenameFile,
        })
      );

      const mockEvent = {
        key: "F2",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      await act(async () => {
        await result.current.handleKeyDown(mockEvent, "file-1");
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.renamingFileId).toBe("file-1");
    });
  });

  describe("focusedFileId", () => {
    it("포커스된 파일 ID 설정", () => {
      const { result } = renderHook(() =>
        useFilePanelUI({
          files: defaultFiles,
          onAddFile: mockOnAddFile,
          onRemoveFile: mockOnRemoveFile,
        })
      );

      act(() => {
        result.current.setFocusedFileId("file-2");
      });

      expect(result.current.focusedFileId).toBe("file-2");
    });
  });
});

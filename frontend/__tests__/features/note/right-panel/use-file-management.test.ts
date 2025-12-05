/**
 * useFileManagement 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileManagement } from "@/features/note/right-panel/use-file-management";

// Mock stores
const mockAddFile = vi.fn();
const mockRemoveFile = vi.fn();

vi.mock("@/stores", () => ({
  useNoteEditorStore: vi.fn(() => ({
    addFile: mockAddFile,
    removeFile: mockRemoveFile,
  })),
}));

// Mock mutations
const mockMutateAsync = vi.fn();
vi.mock("@/lib/api/mutations/files.mutations", () => ({
  useSaveNoteFile: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

// Mock API
const mockDeleteFile = vi.fn();
vi.mock("@/lib/api/services/files.api", () => ({
  deleteFile: (id: string) => mockDeleteFile(id),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useFileManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기화", () => {
    it("기본 반환값 확인", () => {
      const { result } = renderHook(() => useFileManagement());

      expect(result.current.handleAddFile).toBeDefined();
      expect(result.current.handleRemoveFile).toBeDefined();
      expect(result.current.isSaving).toBe(false);
    });

    it("noteId 옵션 전달", () => {
      const { result } = renderHook(() =>
        useFileManagement({ noteId: "note-123" })
      );

      expect(result.current.handleAddFile).toBeDefined();
    });
  });

  describe("handleAddFile", () => {
    it("noteId가 없으면 Store에만 추가", async () => {
      const { result } = renderHook(() => useFileManagement());
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      await act(async () => {
        await result.current.handleAddFile(mockFile);
      });

      expect(mockAddFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test.pdf",
          type: "application/pdf",
        })
      );
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it("noteId가 있으면 뮤테이션 호출", async () => {
      const { result } = renderHook(() =>
        useFileManagement({ noteId: "note-123" })
      );
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      await act(async () => {
        await result.current.handleAddFile(mockFile);
      });

      expect(mockMutateAsync).toHaveBeenCalledWith({
        noteId: "note-123",
        file: mockFile,
      });
    });

    it("뮤테이션 실패 시 에러 throw", async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error("Save failed"));

      const { result } = renderHook(() =>
        useFileManagement({ noteId: "note-123" })
      );
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      await expect(
        act(async () => {
          await result.current.handleAddFile(mockFile);
        })
      ).rejects.toThrow("Save failed");
    });
  });

  describe("handleRemoveFile", () => {
    it("파일 삭제 시 API 호출 및 Store 업데이트", async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useFileManagement());

      await act(async () => {
        await result.current.handleRemoveFile("file-123");
      });

      expect(mockDeleteFile).toHaveBeenCalledWith("file-123");
      expect(mockRemoveFile).toHaveBeenCalledWith("file-123");
    });

    it("삭제 실패해도 Store에서 제거", async () => {
      mockDeleteFile.mockRejectedValueOnce(new Error("Delete failed"));

      const { result } = renderHook(() => useFileManagement());

      await act(async () => {
        await result.current.handleRemoveFile("file-123");
      });

      expect(mockRemoveFile).toHaveBeenCalledWith("file-123");
    });
  });
});

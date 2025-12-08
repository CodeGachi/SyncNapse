/**
 * useFileManagement 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileManagement } from "@/features/note/right-panel/use-file-management";

const mockAddFile = vi.fn();
const mockRemoveFile = vi.fn();
const mockMutateAsync = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock("@/stores", () => ({
  useNoteEditorStore: vi.fn(() => ({ addFile: mockAddFile, removeFile: mockRemoveFile })),
}));

vi.mock("@/lib/api/mutations/files.mutations", () => ({
  useSaveNoteFile: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
}));

vi.mock("@/lib/api/services/files.api", () => ({
  deleteFile: (id: string) => mockDeleteFile(id),
}));


describe("useFileManagement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("기본 반환값 확인", () => {
    const { result } = renderHook(() => useFileManagement());
    expect(result.current.handleAddFile).toBeDefined();
    expect(result.current.handleRemoveFile).toBeDefined();
    expect(result.current.isSaving).toBe(false);
  });

  it("handleAddFile - noteId 유무에 따른 동작", async () => {
    const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });

    // noteId 없으면 Store만 업데이트
    const { result: r1 } = renderHook(() => useFileManagement());
    await act(async () => await r1.current.handleAddFile(mockFile));
    expect(mockAddFile).toHaveBeenCalledWith(expect.objectContaining({ name: "test.pdf" }));
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // noteId 있으면 뮤테이션 호출
    mockAddFile.mockClear();
    const { result: r2 } = renderHook(() => useFileManagement({ noteId: "note-123" }));
    await act(async () => await r2.current.handleAddFile(mockFile));
    expect(mockMutateAsync).toHaveBeenCalledWith({ noteId: "note-123", file: mockFile });

    // 뮤테이션 실패 시 에러
    mockMutateAsync.mockRejectedValueOnce(new Error("Save failed"));
    await expect(act(async () => await r2.current.handleAddFile(mockFile))).rejects.toThrow("Save failed");
  });

  it("handleRemoveFile - API 호출 및 Store 업데이트", async () => {
    mockDeleteFile.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useFileManagement());

    await act(async () => await result.current.handleRemoveFile("file-123"));
    expect(mockDeleteFile).toHaveBeenCalledWith("file-123");
    expect(mockRemoveFile).toHaveBeenCalledWith("file-123");

    // 삭제 실패해도 Store에서 제거
    mockDeleteFile.mockRejectedValueOnce(new Error("Delete failed"));
    await act(async () => await result.current.handleRemoveFile("file-456"));
    expect(mockRemoveFile).toHaveBeenCalledWith("file-456");
  });
});

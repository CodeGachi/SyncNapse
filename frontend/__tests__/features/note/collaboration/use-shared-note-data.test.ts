/**
 * use-shared-note-data 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({ useStorage: vi.fn() }));
vi.mock("@/stores", () => ({
  useNoteEditorStore: vi.fn(() => ({ setFiles: vi.fn(), setSelectedFileId: vi.fn(), setCurrentPage: vi.fn(), setPageNotes: vi.fn() })),
}));
vi.mock("@/lib/db", () => ({ initDB: vi.fn() }));
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { useSharedNoteData } from "@/features/note/collaboration/use-shared-note-data";

describe("useSharedNoteData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("비공유 모드면 로딩 false", () => {
    (useStorage as any).mockImplementation((selector: any) =>
      selector({ noteInfo: null, files: [], pageNotes: {}, currentPage: 1, currentFileId: null })
    );

    const { result } = renderHook(() => useSharedNoteData({ isSharedView: false, noteId: "note-1" }));
    expect(result.current.isLoading).toBe(false);
  });

  it("공유 모드에서 noteInfo undefined면 로딩 중", () => {
    (useStorage as any).mockImplementation((selector: any) =>
      selector({ noteInfo: undefined, files: [], pageNotes: {}, currentPage: 1, currentFileId: null })
    );

    const { result } = renderHook(() => useSharedNoteData({ isSharedView: true, noteId: "note-1" }));
    expect(result.current.isLoading).toBe(true);
  });

  it("Storage 데이터 반환", () => {
    const mockData = {
      noteInfo: { id: "note-1", title: "Test", type: "educator", folderId: "folder-1", createdAt: 1000, updatedAt: 2000 },
      files: [{ id: "file-1", fileName: "test.pdf", fileType: "application/pdf", fileSize: 1000, uploadedAt: 1000 }],
      pageNotes: { "file-1_page-1": [{ id: "block-1", type: "text", content: "Hello", order: 0 }] },
      currentPage: 1,
      currentFileId: "file-1",
    };

    (useStorage as any).mockImplementation((selector: any) => selector(mockData));

    const { result } = renderHook(() => useSharedNoteData({ isSharedView: false, noteId: "note-1" }));
    expect(result.current.noteInfo).toEqual(mockData.noteInfo);
    expect(result.current.files).toEqual(mockData.files);
    expect(result.current.pageNotes).toEqual(mockData.pageNotes);
  });
});

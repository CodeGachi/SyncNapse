/**
 * use-shared-note-data 테스트
 * 공유 모드에서 Liveblocks Storage로부터 노트 데이터를 로드하는 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock Liveblocks
vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
}));

// Mock stores
vi.mock("@/stores", () => ({
  useNoteEditorStore: vi.fn(() => ({
    setFiles: vi.fn(),
    setSelectedFileId: vi.fn(),
    setCurrentPage: vi.fn(),
    setPageNotes: vi.fn(),
  })),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  initDB: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { useSharedNoteData } from "@/features/note/collaboration/use-shared-note-data";

describe("useSharedNoteData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("비공유 모드", () => {
    it("isSharedView가 false면 로딩 false", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ noteInfo: null, files: [], pageNotes: {}, currentPage: 1, currentFileId: null });
      });

      const { result } = renderHook(() =>
        useSharedNoteData({
          isSharedView: false,
          noteId: "note-1",
        })
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("공유 모드 로딩", () => {
    it("noteInfo가 undefined면 로딩 중", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        const root = { noteInfo: undefined, files: [], pageNotes: {}, currentPage: 1, currentFileId: null };
        return selector(root);
      });

      const { result } = renderHook(() =>
        useSharedNoteData({
          isSharedView: true,
          noteId: "note-1",
        })
      );

      // noteInfo가 undefined이고 noteCreated가 false면 로딩 중
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("데이터 반환", () => {
    it("Storage에서 가져온 데이터 반환", () => {
      const mockNoteInfo = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      const mockFiles = [
        {
          id: "file-1",
          fileName: "test.pdf",
          fileType: "application/pdf",
          fileSize: 1000,
          uploadedAt: 1000,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        const key = selector.toString();
        const root = {
          noteInfo: mockNoteInfo,
          files: mockFiles,
          pageNotes: {},
          currentPage: 1,
          currentFileId: "file-1",
        };
        return selector(root);
      });

      const { result } = renderHook(() =>
        useSharedNoteData({
          isSharedView: false,
          noteId: "note-1",
        })
      );

      expect(result.current.noteInfo).toEqual(mockNoteInfo);
      expect(result.current.files).toEqual(mockFiles);
      expect(result.current.currentFileId).toBe("file-1");
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe("pageNotes 데이터", () => {
    it("필기 데이터 반환", () => {
      const mockPageNotes = {
        "file-1_page-1": [
          { id: "block-1", type: "text", content: "Hello", order: 0 },
          { id: "block-2", type: "checkbox", content: "Todo", checked: false, order: 1 },
        ],
      };

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        const root = {
          noteInfo: null,
          files: [],
          pageNotes: mockPageNotes,
          currentPage: 1,
          currentFileId: null,
        };
        return selector(root);
      });

      const { result } = renderHook(() =>
        useSharedNoteData({
          isSharedView: false,
          noteId: "note-1",
        })
      );

      expect(result.current.pageNotes).toEqual(mockPageNotes);
    });
  });

  describe("빈 데이터", () => {
    it("데이터 없을 때 기본값", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        const root = {
          noteInfo: null,
          files: [],
          pageNotes: {},
          currentPage: undefined,
          currentFileId: undefined,
        };
        return selector(root);
      });

      const { result } = renderHook(() =>
        useSharedNoteData({
          isSharedView: false,
          noteId: "note-1",
        })
      );

      expect(result.current.noteInfo).toBeNull();
      expect(result.current.files).toEqual([]);
      expect(result.current.pageNotes).toEqual({});
    });
  });
});

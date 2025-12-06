/**
 * use-sync-note-to-liveblocks 테스트
 * 노트 데이터를 Liveblocks Storage에 동기화하는 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock Liveblocks
const mockSyncNoteInfo = vi.fn();
const mockSyncFiles = vi.fn();
const mockSyncPageNotes = vi.fn();

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useMutation: vi.fn((fn, deps) => {
    // fn의 내용에 따라 적절한 mock 반환
    const fnStr = fn.toString();
    if (fnStr.includes("noteInfo")) return mockSyncNoteInfo;
    if (fnStr.includes("files")) return mockSyncFiles;
    if (fnStr.includes("pageNotes")) return mockSyncPageNotes;
    return vi.fn();
  }),
}));

// Mock stores
const mockPageNotes = {};
vi.mock("@/stores", () => ({
  useNoteEditorStore: vi.fn(() => ({
    pageNotes: mockPageNotes,
  })),
}));

vi.mock("@/lib/sync/sync-store", () => ({
  useSyncStore: {
    getState: () => ({
      queue: {
        items: [],
      },
    }),
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useSyncNoteToLiveblocks } from "@/features/note/collaboration/use-sync-note-to-liveblocks";
import type { Note, FileItem } from "@/lib/types";

describe("useSyncNoteToLiveblocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("협업 비활성화", () => {
    it("isCollaborating false면 동기화 안함", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: false,
          isEducator: true,
          note,
          files: [],
        })
      );

      expect(mockSyncNoteInfo).not.toHaveBeenCalled();
      expect(mockSyncFiles).not.toHaveBeenCalled();
      expect(mockSyncPageNotes).not.toHaveBeenCalled();
    });
  });

  describe("학생 모드", () => {
    it("isEducator false면 동기화 안함", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: true,
          isEducator: false,
          note,
          files: [],
        })
      );

      expect(mockSyncNoteInfo).not.toHaveBeenCalled();
    });
  });

  describe("노트 없음", () => {
    it("note가 null이면 동기화 안함", () => {
      renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: true,
          isEducator: true,
          note: null,
          files: [],
        })
      );

      expect(mockSyncNoteInfo).not.toHaveBeenCalled();
    });
  });

  describe("Educator 협업 시작", () => {
    it("노트 정보 동기화", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: true,
          isEducator: true,
          note,
          files: [],
        })
      );

      expect(mockSyncNoteInfo).toHaveBeenCalledWith(note);
    });

    it("파일 있으면 파일 동기화", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      const files: FileItem[] = [
        {
          id: "file-1",
          name: "test.pdf",
          type: "application/pdf",
          size: 1000,
          url: "blob:...",
          uploadedAt: "2024-01-01T00:00:00Z",
        },
      ];

      renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: true,
          isEducator: true,
          note,
          files,
        })
      );

      expect(mockSyncFiles).toHaveBeenCalledWith(files, note.id);
    });

    it("파일 없으면 파일 동기화 스킵", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: true,
          isEducator: true,
          note,
          files: [],
        })
      );

      expect(mockSyncFiles).not.toHaveBeenCalled();
    });
  });

  describe("반환값", () => {
    it("동기화 함수들 반환", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        type: "educator",
        folderId: "folder-1",
        createdAt: 1000,
        updatedAt: 2000,
      };

      const { result } = renderHook(() =>
        useSyncNoteToLiveblocks({
          isCollaborating: false,
          isEducator: true,
          note,
          files: [],
        })
      );

      expect(result.current.syncNoteInfo).toBeDefined();
      expect(result.current.syncFiles).toBeDefined();
      expect(result.current.syncPageNotes).toBeDefined();
    });
  });
});

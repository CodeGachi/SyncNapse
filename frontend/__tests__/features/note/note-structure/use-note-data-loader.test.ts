/**
 * use-note-data-loader 훅 테스트
 * 파일 로드 및 동기화 이벤트 처리
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNoteDataLoader } from "@/features/note/note-structure/use-note-data-loader";
import React from "react";

// Mock stores
const mockLoadFiles = vi.fn();

vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({
    loadFiles: mockLoadFiles,
  }),
}));

// Mock React Query
const mockInvalidateQueries = vi.fn();
const mockFilesWithId = vi.fn(() => []);

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/api/queries/files.queries", () => ({
  useFilesWithIdByNote: (noteId: string | null) => ({
    data: noteId ? mockFilesWithId() : [],
  }),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
global.URL.createObjectURL = mockCreateObjectURL;

describe("useNoteDataLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilesWithId.mockReturnValue([]);
  });

  describe("파일 로드", () => {
    it("noteId가 없으면 빈 배열로 초기화", () => {
      renderHook(() => useNoteDataLoader({ noteId: null }));

      expect(mockLoadFiles).toHaveBeenCalledWith([]);
    });

    it("noteId가 있으면 파일 로드", () => {
      const mockFiles = [
        {
          id: 1,
          file: new File(["content"], "test.pdf", { type: "application/pdf" }),
          backendId: "backend-1",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      mockFilesWithId.mockReturnValue(mockFiles);

      renderHook(() => useNoteDataLoader({ noteId: "note-1" }));

      expect(mockLoadFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          name: "test.pdf",
          type: "application/pdf",
          backendId: "backend-1",
        }),
      ]);
    });

    it("여러 파일 로드", () => {
      const mockFiles = [
        {
          id: 1,
          file: new File(["content1"], "doc1.pdf", { type: "application/pdf" }),
          backendId: "backend-1",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          file: new File(["content2"], "doc2.pdf", { type: "application/pdf" }),
          backendId: "backend-2",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ];
      mockFilesWithId.mockReturnValue(mockFiles);

      renderHook(() => useNoteDataLoader({ noteId: "note-1" }));

      expect(mockLoadFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: "doc1.pdf" }),
          expect.objectContaining({ id: 2, name: "doc2.pdf" }),
        ])
      );
    });

    it("파일 항목에 URL 생성", () => {
      const mockFiles = [
        {
          id: 1,
          file: new File(["content"], "test.pdf", { type: "application/pdf" }),
          backendId: "backend-1",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      mockFilesWithId.mockReturnValue(mockFiles);

      renderHook(() => useNoteDataLoader({ noteId: "note-1" }));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLoadFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          url: "blob:mock-url",
        }),
      ]);
    });
  });

  describe("파일 동기화 이벤트", () => {
    it("files-synced 이벤트 리스너 등록", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useNoteDataLoader({ noteId: "note-1" }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "files-synced",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it("files-synced 이벤트시 쿼리 무효화", () => {
      renderHook(() => useNoteDataLoader({ noteId: "note-1" }));

      // 이벤트 발생
      const event = new CustomEvent("files-synced", {
        detail: { noteId: "note-1" },
      });
      window.dispatchEvent(event);

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["files", "note", "note-1", "withId"],
      });
    });

    it("다른 noteId의 이벤트는 무시", () => {
      renderHook(() => useNoteDataLoader({ noteId: "note-1" }));

      // 다른 noteId로 이벤트 발생
      const event = new CustomEvent("files-synced", {
        detail: { noteId: "note-2" },
      });
      window.dispatchEvent(event);

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it("언마운트시 이벤트 리스너 제거", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useNoteDataLoader({ noteId: "note-1" })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "files-synced",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("noteId 변경", () => {
    it("noteId 변경시 파일 다시 로드", () => {
      mockFilesWithId.mockReturnValue([
        {
          id: 1,
          file: new File([""], "file1.pdf", { type: "application/pdf" }),
          backendId: "b1",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ]);

      const { rerender } = renderHook(
        ({ noteId }) => useNoteDataLoader({ noteId }),
        { initialProps: { noteId: "note-1" } }
      );

      expect(mockLoadFiles).toHaveBeenCalledTimes(1);

      // noteId 변경
      mockFilesWithId.mockReturnValue([
        {
          id: 2,
          file: new File([""], "file2.pdf", { type: "application/pdf" }),
          backendId: "b2",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ]);

      rerender({ noteId: "note-2" });

      expect(mockLoadFiles).toHaveBeenCalledTimes(2);
    });
  });
});

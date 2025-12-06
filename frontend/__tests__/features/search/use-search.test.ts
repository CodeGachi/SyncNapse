/**
 * use-search 테스트
 * IndexedDB 기반 로컬 검색 기능
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSearch } from "@/features/search/use-search";

// Mock dependencies
vi.mock("@/lib/hooks/use-debounce", () => ({
  useDebounce: vi.fn((value) => value), // 디바운스 즉시 반환
}));

const mockSearch = vi.fn();
vi.mock("@/stores/search-sync-store", () => ({
  useSearchSyncStore: () => ({
    search: mockSearch,
  }),
}));

describe("useSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({
      notes: [],
      files: [],
      segments: [],
    });
  });

  describe("초기 상태", () => {
    it("기본값", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe("");
      expect(result.current.isOpen).toBe(false);
      expect(result.current.results).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.totalResults).toBe(0);
      expect(result.current.hasResults).toBe(false);
    });
  });

  describe("검색어 설정", () => {
    it("검색어 설정 시 드롭다운 열림", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      expect(result.current.query).toBe("test");
      expect(result.current.isOpen).toBe(true);
    });

    it("빈 검색어 시 드롭다운 닫힘", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      act(() => {
        result.current.setQuery("");
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("공백만 있는 검색어는 검색 안함", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("   ");
      });

      await waitFor(() => {
        expect(mockSearch).not.toHaveBeenCalled();
      });
    });
  });

  describe("검색 실행", () => {
    it("검색 결과 반환", async () => {
      mockSearch.mockResolvedValue({
        notes: [
          { id: "note-1", title: "Test Note", updatedAt: 1704067200000 },
        ],
        files: [
          {
            id: "file-1",
            fileName: "test.pdf",
            noteTitle: "Test Note",
            noteId: "note-1",
            updatedAt: 1704067200000,
          },
        ],
        segments: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.results).toBeDefined();
      });

      expect(result.current.results?.notes).toHaveLength(1);
      expect(result.current.results?.files).toHaveLength(1);
      expect(result.current.totalResults).toBe(2);
      expect(result.current.hasResults).toBe(true);
    });

    it("검색 에러 처리", async () => {
      mockSearch.mockRejectedValue(new Error("Search failed"));

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("error");
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe("Search failed");
      expect(result.current.results).toBeUndefined();
    });
  });

  describe("handleFocus", () => {
    it("검색어 있으면 드롭다운 열기", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      // isOpen을 false로 설정
      act(() => {
        result.current.setIsOpen(false);
      });

      act(() => {
        result.current.handleFocus();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("검색어 없으면 드롭다운 열지 않음", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleFocus();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("handleBlur", () => {
    it("드롭다운 닫기 (지연)", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleBlur();
      });

      // 즉시 닫히지 않음
      expect(result.current.isOpen).toBe(true);

      // 200ms 후 닫힘
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isOpen).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("clearSearch", () => {
    it("검색 초기화", async () => {
      mockSearch.mockResolvedValue({
        notes: [{ id: "note-1", title: "Test", updatedAt: 1000 }],
        files: [],
        segments: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.results).toBeDefined();
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe("");
      expect(result.current.isOpen).toBe(false);
      expect(result.current.results).toBeUndefined();
    });
  });

  describe("결과 포맷 변환", () => {
    it("노트 결과 포맷", async () => {
      mockSearch.mockResolvedValue({
        notes: [
          { id: "note-1", title: "Test Note", updatedAt: 1704067200000 },
        ],
        files: [],
        segments: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.results).toBeDefined();
      });

      const note = result.current.results?.notes[0];
      expect(note?.id).toBe("note-1");
      expect(note?.type).toBe("note");
      expect(note?.title).toBe("Test Note");
      expect(note?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}/); // ISO 형식
    });

    it("파일 결과 포맷", async () => {
      mockSearch.mockResolvedValue({
        notes: [],
        files: [
          {
            id: "file-1",
            fileName: "test.pdf",
            noteTitle: "Parent Note",
            noteId: "note-1",
            updatedAt: 1704067200000,
          },
        ],
        segments: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.results).toBeDefined();
      });

      const file = result.current.results?.files[0];
      expect(file?.id).toBe("file-1");
      expect(file?.type).toBe("file");
      expect(file?.title).toBe("test.pdf");
      expect(file?.noteTitle).toBe("Parent Note");
      expect(file?.noteId).toBe("note-1");
    });

    it("세그먼트 결과 포맷", async () => {
      mockSearch.mockResolvedValue({
        notes: [],
        files: [],
        segments: [
          {
            id: "seg-1",
            text: "Hello world",
            startTime: 10,
            endTime: 15,
            sessionId: "session-1",
            sessionTitle: "Recording 1",
            noteId: "note-1",
            noteTitle: "Test Note",
            confidence: 0.95,
          },
        ],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("hello");
      });

      await waitFor(() => {
        expect(result.current.results).toBeDefined();
      });

      const segment = result.current.results?.segments[0];
      expect(segment?.id).toBe("seg-1");
      expect(segment?.type).toBe("segment");
      expect(segment?.text).toBe("Hello world");
      expect(segment?.startTime).toBe(10);
      expect(segment?.endTime).toBe(15);
      expect(segment?.confidence).toBe(0.95);
    });
  });

  describe("옵션", () => {
    it("커스텀 debounceDelay", () => {
      const { result } = renderHook(() =>
        useSearch({ debounceDelay: 500 })
      );

      // 훅이 정상 동작하는지 확인
      expect(result.current.query).toBe("");
    });
  });
});

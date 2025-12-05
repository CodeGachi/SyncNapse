/**
 * useSearch 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSearch } from "@/features/search/use-search";

// Mock stores
const mockSearch = vi.fn();

vi.mock("@/stores/search-sync-store", () => ({
  useSearchSyncStore: () => ({
    search: mockSearch,
  }),
}));

// Mock debounce - 즉시 실행하도록
vi.mock("@/lib/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));

describe("useSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("query가 빈 문자열로 시작", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe("");
    });

    it("isOpen이 false로 시작", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.isOpen).toBe(false);
    });

    it("results가 undefined로 시작", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.results).toBeUndefined();
    });

    it("isLoading이 false로 시작", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("setQuery", () => {
    it("검색어 설정", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      expect(result.current.query).toBe("test");
    });

    it("검색어 입력시 드롭다운 열림", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("빈 검색어 입력시 드롭다운 닫힘", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      act(() => {
        result.current.setQuery("");
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("공백만 있는 검색어도 드롭다운 닫힘", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("   ");
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("검색 실행", () => {
    it("검색어가 있으면 search 함수 호출", async () => {
      mockSearch.mockResolvedValue({
        notes: [],
        files: [],
        segments: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith("test");
      });
    });

    it("검색 결과를 API 형식으로 변환", async () => {
      mockSearch.mockResolvedValue({
        notes: [
          { id: "note-1", title: "Test Note", updatedAt: 1700000000000 },
        ],
        files: [
          {
            id: "file-1",
            fileName: "test.pdf",
            noteTitle: "Test Note",
            noteId: "note-1",
            updatedAt: 1700000000000,
          },
        ],
        segments: [
          {
            id: "seg-1",
            text: "Hello world",
            startTime: 0,
            endTime: 1000,
            sessionId: "session-1",
            sessionTitle: "Session 1",
            noteId: "note-1",
            noteTitle: "Test Note",
            confidence: 0.95,
          },
        ],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.results).toBeDefined();
      });

      expect(result.current.results?.notes).toHaveLength(1);
      expect(result.current.results?.notes[0].type).toBe("note");
      expect(result.current.results?.files).toHaveLength(1);
      expect(result.current.results?.files[0].type).toBe("file");
      expect(result.current.results?.segments).toHaveLength(1);
      expect(result.current.results?.segments[0].type).toBe("segment");
    });

    it("검색 실패시 에러 설정", async () => {
      mockSearch.mockRejectedValue(new Error("Search failed"));

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toBe("Search failed");
      expect(result.current.results).toBeUndefined();
    });
  });

  describe("totalResults", () => {
    it("결과가 없으면 0", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.totalResults).toBe(0);
    });

    it("결과의 총 개수 계산", async () => {
      mockSearch.mockResolvedValue({
        notes: [{ id: "1", title: "Note", updatedAt: 1700000000000 }],
        files: [
          { id: "2", fileName: "file", noteTitle: "Note", noteId: "1", updatedAt: 1700000000000 },
          { id: "3", fileName: "file2", noteTitle: "Note", noteId: "1", updatedAt: 1700000000000 },
        ],
        segments: [
          { id: "4", text: "seg", startTime: 0, endTime: 100, sessionId: "s1", sessionTitle: "S1", noteId: "1", noteTitle: "Note", confidence: 0.9 },
        ],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.totalResults).toBe(4);
      });
    });
  });

  describe("hasResults", () => {
    it("결과가 없으면 false", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.hasResults).toBe(false);
    });

    it("결과가 있으면 true", async () => {
      mockSearch.mockResolvedValue({
        notes: [{ id: "1", title: "Note", updatedAt: 1700000000000 }],
        files: [],
        segments: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      await waitFor(() => {
        expect(result.current.hasResults).toBe(true);
      });
    });
  });

  describe("handleFocus", () => {
    it("검색어가 있으면 드롭다운 열기", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery("test");
      });

      act(() => {
        result.current.setIsOpen(false);
      });

      act(() => {
        result.current.handleFocus();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("검색어가 없으면 드롭다운 열지 않음", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleFocus();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("handleBlur", () => {
    it("드롭다운 닫기 (지연 후)", async () => {
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
        notes: [{ id: "1", title: "Note", updatedAt: 1700000000000 }],
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
});

/**
 * use-search-dropdown 테스트
 * 검색 드롭다운 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useSearchDropdown,
  formatTime,
  highlightText,
} from "@/features/dashboard/search/use-search-dropdown";

// Mock dependencies
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockResults = {
  notes: [
    { id: "note-1", title: "Note 1" },
    { id: "note-2", title: "Note 2" },
    { id: "note-3", title: "Note 3" },
    { id: "note-4", title: "Note 4" },
    { id: "note-5", title: "Note 5" },
    { id: "note-6", title: "Note 6" },
  ],
  files: [
    { id: "file-1", name: "File 1", noteId: "note-1" },
    { id: "file-2", name: "File 2", noteId: "note-2" },
  ],
  segments: [
    { id: "seg-1", text: "Segment 1", noteId: "note-1", startTime: 30 },
    { id: "seg-2", text: "Segment 2", noteId: "note-2", startTime: 120 },
  ],
};

describe("useSearchDropdown", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("기본 표시 개수 5개", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      expect(result.current.visibleCounts.notes).toBe(5);
      expect(result.current.visibleCounts.files).toBe(5);
      expect(result.current.visibleCounts.segments).toBe(5);
    });

    it("총 결과 수 계산", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      expect(result.current.totalResults).toBe(10); // 6 + 2 + 2
    });
  });

  describe("더보기", () => {
    it("notes 더보기", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      act(() => {
        result.current.showMore("notes");
      });

      expect(result.current.visibleCounts.notes).toBe(10); // 5 + 5
    });

    it("files 더보기", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      act(() => {
        result.current.showMore("files");
      });

      expect(result.current.visibleCounts.files).toBe(10);
    });

    it("segments 더보기", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      act(() => {
        result.current.showMore("segments");
      });

      expect(result.current.visibleCounts.segments).toBe(10);
    });

    it("여러 번 더보기", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      act(() => {
        result.current.showMore("notes");
        result.current.showMore("notes");
      });

      expect(result.current.visibleCounts.notes).toBe(15); // 5 + 5 + 5
    });
  });

  describe("노트 클릭", () => {
    it("노트 페이지로 이동 후 닫기", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      result.current.handleNoteClick({ id: "note-123", title: "Test Note" } as any);

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-123");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("파일 클릭", () => {
    it("파일이 속한 노트로 이동 후 닫기", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      result.current.handleFileClick({
        id: "file-1",
        name: "Test File",
        noteId: "note-456",
      } as any);

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-456");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("세그먼트 클릭", () => {
    it("노트로 이동 + 시간 파라미터", () => {
      const { result } = renderHook(() =>
        useSearchDropdown({ results: mockResults, onClose: mockOnClose })
      );

      result.current.handleSegmentClick({
        id: "seg-1",
        text: "Test Segment",
        noteId: "note-789",
        startTime: 65,
      } as any);

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-789?t=65");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("빈 결과", () => {
    it("빈 결과에서 총 개수 0", () => {
      const emptyResults = { notes: [], files: [], segments: [] };
      const { result } = renderHook(() =>
        useSearchDropdown({ results: emptyResults, onClose: mockOnClose })
      );

      expect(result.current.totalResults).toBe(0);
    });
  });
});

describe("formatTime", () => {
  it("0초", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("59초", () => {
    expect(formatTime(59)).toBe("0:59");
  });

  it("1분", () => {
    expect(formatTime(60)).toBe("1:00");
  });

  it("1분 30초", () => {
    expect(formatTime(90)).toBe("1:30");
  });

  it("10분 5초", () => {
    expect(formatTime(605)).toBe("10:05");
  });

  it("소수점 제거", () => {
    expect(formatTime(65.7)).toBe("1:05");
  });
});

describe("highlightText", () => {
  it("검색어 하이라이트", () => {
    const result = highlightText("Hello World", "World");

    expect(result).toHaveLength(2);
  });

  it("대소문자 구분 없이 하이라이트", () => {
    const result = highlightText("Hello World", "world");

    expect(result).toHaveLength(2);
  });

  it("검색어 없으면 원본 텍스트 반환", () => {
    const result = highlightText("Hello World", "");

    expect(result).toBe("Hello World");
  });

  it("공백만 있는 검색어", () => {
    const result = highlightText("Hello World", "   ");

    expect(result).toBe("Hello World");
  });

  it("여러 번 등장하는 검색어", () => {
    const result = highlightText("test test test", "test");

    expect(result).toHaveLength(5); // test, " ", test, " ", test
  });
});

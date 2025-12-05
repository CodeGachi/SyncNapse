/**
 * usePdfSearch 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfSearch } from "@/features/note/viewer/use-pdf-search";
import type { RefObject } from "react";

describe("usePdfSearch", () => {
  let mockSetCurrentPage: ReturnType<typeof vi.fn>;
  let mockPdfDoc: any;
  let mockTextLayerRef: RefObject<HTMLDivElement | null>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetCurrentPage = vi.fn();

    // Mock PDF document
    mockPdfDoc = {
      getPage: vi.fn().mockImplementation((pageNum) =>
        Promise.resolve({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: `Page ${pageNum} content with Hello and test text` }],
          }),
        })
      ),
    };

    // Mock text layer ref with querySelectorAll
    mockTextLayerRef = {
      current: {
        querySelectorAll: vi.fn().mockReturnValue([]),
      } as unknown as HTMLDivElement,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 상태", () => {
    it("searchQuery가 빈 문자열로 시작", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      expect(result.current.searchQuery).toBe("");
    });

    it("isSearchOpen이 false로 시작", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      expect(result.current.isSearchOpen).toBe(false);
    });

    it("currentMatchIndex가 0으로 시작", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      expect(result.current.currentMatchIndex).toBe(0);
    });

    it("matches가 빈 배열로 시작", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      expect(result.current.matches).toEqual([]);
    });

    it("isSearching이 false로 시작", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      expect(result.current.isSearching).toBe(false);
    });
  });

  describe("setIsSearchOpen", () => {
    it("검색창 열기/닫기", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      expect(result.current.isSearchOpen).toBe(false);

      act(() => {
        result.current.setIsSearchOpen(true);
      });

      expect(result.current.isSearchOpen).toBe(true);
    });
  });

  describe("setSearchQuery", () => {
    it("검색어 설정", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.setSearchQuery("test");
      });

      expect(result.current.searchQuery).toBe("test");
    });
  });

  describe("goToNextMatch", () => {
    it("매치가 없으면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.goToNextMatch();
      });

      expect(result.current.currentMatchIndex).toBe(0);
      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe("goToPrevMatch", () => {
    it("매치가 없으면 아무것도 하지 않음", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.goToPrevMatch();
      });

      expect(result.current.currentMatchIndex).toBe(0);
      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe("closeSearch", () => {
    it("검색 상태 초기화", () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.setIsSearchOpen(true);
        result.current.setSearchQuery("test");
      });

      act(() => {
        result.current.closeSearch();
      });

      expect(result.current.isSearchOpen).toBe(false);
      expect(result.current.searchQuery).toBe("");
      expect(result.current.matches).toEqual([]);
      expect(result.current.currentMatchIndex).toBe(0);
    });
  });

  describe("pdfDoc가 없을 때", () => {
    it("검색 실행해도 에러 없음", async () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: null,
          numPages: 10,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.setSearchQuery("test");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.matches).toEqual([]);
    });
  });

  describe("빈 검색어", () => {
    it("빈 검색어로 검색시 매치 초기화", async () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 3,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.setSearchQuery("");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.matches).toEqual([]);
    });

    it("공백만 있는 검색어도 무시", async () => {
      const { result } = renderHook(() =>
        usePdfSearch({
          pdfDoc: mockPdfDoc,
          numPages: 3,
          currentPage: 1,
          setCurrentPage: mockSetCurrentPage,
          textLayerRef: mockTextLayerRef,
        })
      );

      act(() => {
        result.current.setSearchQuery("   ");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.matches).toEqual([]);
    });
  });
});

/**
 * usePdfSearch 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfSearch } from "@/features/note/viewer/use-pdf-search";

beforeEach(() => { vi.clearAllMocks(); });

describe("usePdfSearch", () => {
  const mockSetCurrentPage = vi.fn();
  const mockTextLayerRef = { current: { querySelectorAll: vi.fn(() => []) } as any };

  it("초기 상태", () => {
    const { result } = renderHook(() => usePdfSearch({
      pdfDoc: null, numPages: 10, currentPage: 1, setCurrentPage: mockSetCurrentPage, textLayerRef: mockTextLayerRef,
    }));
    expect(result.current.searchQuery).toBe("");
    expect(result.current.isSearchOpen).toBe(false);
    expect(result.current.matches).toEqual([]);
  });

  it("setSearchQuery로 검색어 설정", () => {
    const { result } = renderHook(() => usePdfSearch({
      pdfDoc: null, numPages: 10, currentPage: 1, setCurrentPage: mockSetCurrentPage, textLayerRef: mockTextLayerRef,
    }));
    act(() => { result.current.setSearchQuery("test"); });
    expect(result.current.searchQuery).toBe("test");
  });

  it("closeSearch로 검색 초기화", () => {
    const { result } = renderHook(() => usePdfSearch({
      pdfDoc: null, numPages: 10, currentPage: 1, setCurrentPage: mockSetCurrentPage, textLayerRef: mockTextLayerRef,
    }));
    act(() => { result.current.setIsSearchOpen(true); result.current.setSearchQuery("test"); });
    act(() => { result.current.closeSearch(); });
    expect(result.current.isSearchOpen).toBe(false);
    expect(result.current.searchQuery).toBe("");
  });
});

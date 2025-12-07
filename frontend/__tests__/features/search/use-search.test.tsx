/**
 * useSearch 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearch } from "@/features/search/use-search";

vi.mock("@/stores/search-sync-store", () => ({
  useSearchSyncStore: () => ({ search: vi.fn() }),
}));
vi.mock("@/lib/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("useSearch", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.query).toBe("");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("setQuery로 검색어 설정", () => {
    const { result } = renderHook(() => useSearch());
    act(() => { result.current.setQuery("test"); });
    expect(result.current.query).toBe("test");
    expect(result.current.isOpen).toBe(true);
  });

  it("clearSearch로 초기화", () => {
    const { result } = renderHook(() => useSearch());
    act(() => { result.current.setQuery("test"); });
    act(() => { result.current.clearSearch(); });
    expect(result.current.query).toBe("");
    expect(result.current.isOpen).toBe(false);
  });
});

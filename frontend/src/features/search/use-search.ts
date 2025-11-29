/**
 * Search Hook
 * 통합 검색 기능을 위한 훅
 */

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { searchAll } from "@/lib/api/services/search.api";
import type { ApiSearchResponse } from "@/lib/api/types/api.types";

interface UseSearchOptions {
  /** 디바운스 지연 시간 (ms) */
  debounceDelay?: number;
  /** 각 카테고리별 최대 결과 수 */
  limit?: number;
}

interface UseSearchReturn {
  /** 현재 검색어 */
  query: string;
  /** 검색어 설정 함수 */
  setQuery: (query: string) => void;
  /** 드롭다운 열림 상태 */
  isOpen: boolean;
  /** 드롭다운 열림 상태 설정 함수 */
  setIsOpen: (isOpen: boolean) => void;
  /** 검색 결과 */
  results: ApiSearchResponse | undefined;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 */
  error: Error | null;
  /** 총 결과 수 */
  totalResults: number;
  /** 결과가 있는지 여부 */
  hasResults: boolean;
  /** 검색창 포커스 핸들러 */
  handleFocus: () => void;
  /** 검색창 블러 핸들러 */
  handleBlur: () => void;
  /** 검색 초기화 */
  clearSearch: () => void;
}

/**
 * 통합 검색 훅
 *
 * @param options - 옵션
 * @returns 검색 상태 및 함수들
 *
 * @example
 * const { query, setQuery, results, isLoading, isOpen } = useSearch();
 *
 * <input
 *   value={query}
 *   onChange={(e) => setQuery(e.target.value)}
 *   onFocus={handleFocus}
 * />
 * {isOpen && results && <SearchDropdown results={results} />}
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { debounceDelay = 300, limit = 5 } = options;

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebounce(query, debounceDelay);

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", debouncedQuery, limit],
    queryFn: () => searchAll(debouncedQuery, limit),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 30 * 1000, // 30초
  });

  const totalResults =
    (data?.notes.length || 0) +
    (data?.files.length || 0) +
    (data?.segments.length || 0);

  const handleFocus = useCallback(() => {
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  }, [query]);

  const handleBlur = useCallback(() => {
    // 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록 함
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setIsOpen(false);
  }, []);

  // 검색어가 있으면 드롭다운 열기
  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    if (newQuery.trim().length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    isOpen,
    setIsOpen,
    results: data,
    isLoading: isLoading && debouncedQuery.trim().length > 0,
    error: error as Error | null,
    totalResults,
    hasResults: totalResults > 0,
    handleFocus,
    handleBlur,
    clearSearch,
  };
}

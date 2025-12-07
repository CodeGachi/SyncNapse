/**
 * Search Hook
 * IndexedDB 기반 로컬 검색 기능
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useSearchSyncStore } from "@/stores/search-sync-store";
import type { SearchResults } from "@/lib/db/search";

// API 타입과 호환되는 검색 결과 타입
export interface LocalSearchNoteResult {
  id: string;
  type: "note";
  title: string;
  updatedAt: string;
}

export interface LocalSearchFileResult {
  id: string;
  type: "file";
  title: string;
  noteTitle: string;
  noteId: string;
  updatedAt: string;
}

export interface LocalSearchSegmentResult {
  id: string;
  type: "segment";
  text: string;
  startTime: number;
  endTime: number;
  sessionId: string;
  sessionTitle: string;
  noteId: string;
  noteTitle: string | null;
  confidence: number;
}

export interface LocalSearchResponse {
  notes: LocalSearchNoteResult[];
  files: LocalSearchFileResult[];
  segments: LocalSearchSegmentResult[];
}

interface UseSearchOptions {
  /** 디바운스 지연 시간 (ms) */
  debounceDelay?: number;
  /** 각 카테고리별 최대 결과 수 (초기 표시) */
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
  results: LocalSearchResponse | undefined;
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

// DB 타입 → API 호환 타입 변환
function convertToApiFormat(results: SearchResults): LocalSearchResponse {
  return {
    notes: results.notes.map((note) => ({
      id: note.id,
      type: "note" as const,
      title: note.title,
      updatedAt: new Date(note.updatedAt).toISOString(),
    })),
    files: results.files.map((file) => ({
      id: file.id,
      type: "file" as const,
      title: file.fileName,
      noteTitle: file.noteTitle,
      noteId: file.noteId,
      updatedAt: new Date(file.updatedAt).toISOString(),
    })),
    segments: results.segments.map((segment) => ({
      id: segment.id,
      type: "segment" as const,
      text: segment.text,
      startTime: segment.startTime,
      endTime: segment.endTime,
      sessionId: segment.sessionId,
      sessionTitle: segment.sessionTitle,
      noteId: segment.noteId,
      noteTitle: segment.noteTitle,
      confidence: segment.confidence,
    })),
  };
}

/**
 * 통합 검색 훅 (IndexedDB 로컬 검색)
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
  const { debounceDelay = 100 } = options; // 로컬 검색이므로 디바운스 줄임

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<LocalSearchResponse | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { search } = useSearchSyncStore();

  const debouncedQuery = useDebounce(query, debounceDelay);

  // 검색 실행
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults(undefined);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await search(debouncedQuery);
        const converted = convertToApiFormat(searchResults);
        setResults(converted);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("검색 실패"));
        setResults(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, search]);

  const totalResults = useMemo(() => {
    if (!results) return 0;
    return results.notes.length + results.files.length + results.segments.length;
  }, [results]);

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
    setResults(undefined);
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
    results,
    isLoading: isLoading && debouncedQuery.trim().length > 0,
    error,
    totalResults,
    hasResults: totalResults > 0,
    handleFocus,
    handleBlur,
    clearSearch,
  };
}

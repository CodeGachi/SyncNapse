/**
 * 검색 관련 TanStack Query Queries
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  searchAll,
  searchNotes,
  fetchDashboardStats,
  type SearchResult,
  type DashboardStats,
} from "../search.api";
import type { Note } from "@/lib/types";

/**
 * 통합 검색 쿼리
 *
 * @example
 * const { data: results } = useSearch("react");
 */
export function useSearch(
  query: string,
  options?: Omit<UseQueryOptions<SearchResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchAll(query),
    enabled: query.length >= 2, // 최소 2글자 이상
    staleTime: 1000 * 60 * 2, // 2분 (검색 결과는 빠르게 stale 처리)
    gcTime: 1000 * 60 * 5, // 5분
    retry: 1,
    ...options,
  });
}

/**
 * 노트 검색 쿼리
 *
 * @example
 * const { data: notes } = useSearchNotes("typescript");
 */
export function useSearchNotes(
  query: string,
  options?: Omit<UseQueryOptions<Note[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["search", "notes", query],
    queryFn: () => searchNotes(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: 1,
    ...options,
  });
}

/**
 * 대시보드 통계 쿼리
 *
 * @example
 * const { data: stats } = useDashboardStats();
 */
export function useDashboardStats(
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10, // 10분
    retry: 2,
    refetchOnWindowFocus: true, // 포커스 시 자동 갱신
    ...options,
  });
}

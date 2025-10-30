/**
 * 폴더 관련 TanStack Query Queries
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchAllFolders } from "../client/folders.api";
import type { DBFolder } from "@/lib/db/folders";

/**
 * 모든 폴더 조회 (IndexedDB 또는 Backend)
 */
export function useFoldersQuery(
  options?: Omit<UseQueryOptions<DBFolder[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["folders"],
    queryFn: fetchAllFolders,
    staleTime: 0, // 항상 최신 상태 유지
    gcTime: 1000 * 60 * 10, // 10분
    retry: 2,
    refetchOnWindowFocus: true, // 윈도우 포커스 시 재조회
    ...options,
  });
}

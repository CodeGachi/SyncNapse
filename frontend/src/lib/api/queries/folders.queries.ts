/**
 * 폴더 관련 TanStack Query 쿼리
 *
 * 폴더 조회를 위한 useQuery 훅
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchAllFolders } from "../services/folders.api"; // ✅ V2 API로 변경
import type { Folder } from "@/lib/types";

/**
 * 전체 폴더 목록 조회 쿼리
 *
 * @example
 * const { data: folders, isLoading } = useFoldersQuery();
 */
export function useFoldersQuery(
  options?: Omit<UseQueryOptions<Folder[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["folders"],
    queryFn: fetchAllFolders,
    staleTime: 0,
    gcTime: 1000 * 60 * 10, 
    retry: 2,
    refetchOnWindowFocus: true,
    ...options,
  });
}

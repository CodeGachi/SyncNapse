/**
 * 폴더 관련 TanStack Query Queries
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchFolders, fetchFolderById } from "../folders.api";
import type { Folder } from "@/lib/types";

/**
 * 모든 폴더 조회
 */
export function useFolders(
  options?: Omit<UseQueryOptions<Folder[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10, // 10분
    retry: 2,
    ...options,
  });
}

/**
 * ID로 폴더 조회
 */
export function useFolder(
  folderId: string | null,
  options?: Omit<UseQueryOptions<Folder, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["folders", folderId],
    queryFn: () => {
      if (!folderId) throw new Error("Folder ID is required");
      return fetchFolderById(folderId);
    },
    enabled: !!folderId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    ...options,
  });
}

/**
 * Folder-related TanStack Query queries
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchAllFolders } from "../services/folders.api";
import type { Folder } from "@/lib/types";

/**
 * Fetch all folders
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

/**
 * Trash Related TanStack Query Queries
 *
 * Trash query (GET) operations using useQuery hooks
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchTrashItems } from "../services/trash.api";
import type { DBTrashItem } from "@/lib/db/trash";

/**
 * Trash items query
 *
 * @example
 * const { data: trashItems, isLoading } = useTrashItems();
 */
export function useTrashItems(
  options?: Omit<UseQueryOptions<DBTrashItem[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["trash"],
    queryFn: fetchTrashItems,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    retry: 2,
    ...options,
  });
}

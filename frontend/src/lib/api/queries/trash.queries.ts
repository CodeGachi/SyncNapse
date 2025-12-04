/**
 * 휴지통 관련 TanStack Query 쿼리
 *
 * 휴지통 조회를 위한 useQuery 훅
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchTrashItems } from "../services/trash.api";
import type { DBTrashItem } from "@/lib/db/trash";

/**
 * 휴지통 항목 목록 조회 쿼리
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
    staleTime: 1000 * 60 * 5, // 5분간 신선
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    retry: 2,
    ...options,
  });
}

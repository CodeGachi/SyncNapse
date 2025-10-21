/**
 * 태그 관련 TanStack Query Queries
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchTags, fetchTagById } from "../tags.api";
import type { Tag } from "@/lib/types";

/**
 * 모든 태그 조회
 */
export function useTags(
  options?: Omit<UseQueryOptions<Tag[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: 1000 * 60 * 10, // 10분 (태그는 자주 변경되지 않음)
    gcTime: 1000 * 60 * 30, // 30분
    retry: 2,
    ...options,
  });
}

/**
 * ID로 태그 조회
 */
export function useTag(
  tagId: string | null,
  options?: Omit<UseQueryOptions<Tag, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["tags", tagId],
    queryFn: () => {
      if (!tagId) throw new Error("Tag ID is required");
      return fetchTagById(tagId);
    },
    enabled: !!tagId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    ...options,
  });
}

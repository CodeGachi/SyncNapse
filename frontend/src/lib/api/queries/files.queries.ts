/**
 * 파일 관련 TanStack Query Queries
 *
 * 노트의 파일 조회(GET) 작업을 위한 useQuery 훅들
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchFilesByNote, fetchFilesWithIdByNote, type FileWithId } from "../services/files.api.v2"; // ✅ V2 API로 변경

/**
 * 노트의 파일 목록 조회 (ID 정보 포함)
 * 메인 hook - ID 정보를 유지해야 할 때 사용
 *
 * @example
 * const { data: filesWithId, isLoading } = useFilesWithIdByNote("note-123");
 */
export function useFilesWithIdByNote(
  noteId: string | null,
  options?: Omit<UseQueryOptions<FileWithId[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["files", "note", noteId, "withId"],
    queryFn: () => {
      if (!noteId) return [];
      return fetchFilesWithIdByNote(noteId);
    },
    enabled: !!noteId, // noteId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분간 fresh
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    retry: 2,
    ...options,
  });
}

/**
 * 노트의 파일 목록 조회
 * DEPRECATED: useFilesWithIdByNote 사용 권장 (ID 정보 유지)
 *
 * @example
 * const { data: files, isLoading } = useFilesByNote("note-123");
 */
export function useFilesByNote(
  noteId: string | null,
  options?: Omit<UseQueryOptions<File[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["files", "note", noteId],
    queryFn: () => {
      if (!noteId) return [];
      return fetchFilesByNote(noteId);
    },
    enabled: !!noteId, // noteId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분간 fresh
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    retry: 2,
    ...options,
  });
}

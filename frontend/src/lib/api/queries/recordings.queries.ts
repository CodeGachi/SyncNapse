/**
 * 녹음 관련 TanStack Query 쿼리
 *
 * 녹음 조회를 위한 useQuery 훅
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchRecordingsByNote } from "../services/recordings.api"; // ✅ Updated to V2
import type { DBRecording } from "@/lib/db/recordings";

/**
 * 노트별 녹음 목록 조회 쿼리
 *
 * @example
 * const { data: recordings, isLoading } = useRecordingsByNote("note-123");
 */
export function useRecordingsByNote(
  noteId: string | null,
  options?: Omit<UseQueryOptions<DBRecording[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["recordings", "note", noteId],
    queryFn: () => {
      if (!noteId) return [];
      return fetchRecordingsByNote(noteId);
    },
    enabled: !!noteId, // noteId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분간 신선
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    retry: 2,
    ...options,
  });
}

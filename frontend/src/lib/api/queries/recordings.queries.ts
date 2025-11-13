/**
 * Recording Related TanStack Query Queries
 *
 * Note recording query (GET) operations using useQuery hooks
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchRecordingsByNote } from "../services/recordings.api"; // ✅ Updated to V2
import type { DBRecording } from "@/lib/db/recordings";

/**
 * Note recording list query
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
    enabled: !!noteId, // Execute query only when noteId exists
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    retry: 2,
    ...options,
  });
}

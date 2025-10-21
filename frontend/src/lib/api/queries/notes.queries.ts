/**
 * 노트 관련 TanStack Query Queries
 *
 * 노트 조회(GET) 작업을 위한 useQuery 훅들
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchNotes, fetchNoteById } from "../notes.api";
import type { Note } from "@/lib/types";

/**
 * 모든 노트 조회
 *
 * @example
 * const { data: notes, isLoading } = useNotes();
 */
export function useNotes(
  options?: Omit<UseQueryOptions<Note[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
    staleTime: 1000 * 60 * 5, // 5분간 fresh
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
    retry: 2,
    ...options,
  });
}

/**
 * ID로 노트 조회
 *
 * @example
 * const { data: note, isLoading } = useNote("note-123");
 */
export function useNote(
  noteId: string | null,
  options?: Omit<UseQueryOptions<Note, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["notes", noteId],
    queryFn: () => {
      if (!noteId) throw new Error("Note ID is required");
      return fetchNoteById(noteId);
    },
    enabled: !!noteId, // noteId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    ...options,
  });
}

/**
 * 폴더별 노트 조회 (클라이언트 필터링)
 *
 * @example
 * const { data: notes } = useNotesByLocation("folder1");
 */
export function useNotesByLocation(
  location: string,
  options?: Omit<UseQueryOptions<Note[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["notes", "location", location],
    queryFn: async () => {
      const allNotes = await fetchNotes();
      return allNotes.filter((note) => note.location === location);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

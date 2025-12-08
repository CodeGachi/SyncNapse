/**
 * 노트 관련 TanStack Query Queries
 *
 * 노트 조회(GET) 작업을 위한 useQuery 훅들
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  fetchAllNotes,
  fetchNote,
  fetchNotesByFolder,
  fetchNoteFromServer,
} from "../services/notes.api"; // ✅ V2 API로 변경
import type { Note } from "@/lib/types";

/**
 * 모든 노트 조회 (또는 폴더별 노트 조회)
 *
 * @example
 * const { data: notes, isLoading } = useNotes();
 * const { data: notes, isLoading } = useNotes({ folderId: "folder123" });
 */
export function useNotes(
  params?: {
    folderId?: string;
  },
  options?: Omit<UseQueryOptions<Note[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: params?.folderId ? ["notes", "folder", params.folderId] : ["notes"],
    queryFn: () => fetchNotesByFolder(params?.folderId),
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
  options?: Omit<UseQueryOptions<Note | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["notes", noteId],
    queryFn: () => {
      if (!noteId) return null;
      return fetchNote(noteId);
    },
    enabled: !!noteId, // noteId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    ...options,
  });
}

/**
 * 폴더별 노트 조회
 *
 * @example
 * const { data: notes } = useNotesByFolder("folder1");
 */
export function useNotesByFolder(
  folderId: string,
  options?: Omit<UseQueryOptions<Note[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["notes", "folder", folderId],
    queryFn: () => fetchNotesByFolder(folderId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
}

/**
 * 공유 모드용 노트 조회 (백엔드에서 직접 가져옴, 로컬 DB 건너뜀)
 *
 * @example
 * const { data: note, isLoading } = useSharedNote("note-123");
 */
export function useSharedNote(
  noteId: string | null,
  options?: Omit<UseQueryOptions<Note | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["notes", "shared", noteId],
    queryFn: () => {
      if (!noteId) return null;
      return fetchNoteFromServer(noteId);
    },
    enabled: !!noteId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    ...options,
  });
}

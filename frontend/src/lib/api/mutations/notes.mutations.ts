/**
 * 노트 관련 TanStack Query Mutations
 *
 * 노트 생성/수정/삭제(POST/PATCH/DELETE) 작업을 위한 useMutation 훅들
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  createNote as createNoteApi,
  updateNote as updateNoteApi,
  deleteNote as deleteNoteApi,
} from "../services/notes.api";
import type { Note } from "@/lib/types";

/**
 * 노트 생성 뮤테이션
 *
 * @example
 * const createNote = useCreateNote({
 *   onSuccess: (newNote) => {
 *     router.push(`/note?id=${newNote.id}`);
 *   },
 * });
 *
 * createNote.mutate({ title: "새 노트", folderId: "root", files: [] });
 */
export function useCreateNote(
  options?: {
    onSuccess?: (data: Note) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, folderId, files }: { title: string; folderId: string; files: File[] }) =>
      createNoteApi(title, folderId, files),
    onSuccess: (newNote) => {
      // 노트 목록 캐시 무효화 (자동 재조회)
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      // 새 노트를 캐시에 즉시 추가 (선택적)
      queryClient.setQueryData(["notes", newNote.id], newNote);

      // 사용자 정의 onSuccess 호출
      options?.onSuccess?.(newNote);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * 노트 수정 뮤테이션 (낙관적 업데이트)
 *
 * @example
 * const updateNote = useUpdateNote();
 * updateNote.mutate({
 *   noteId: "note-123",
 *   updates: { title: "수정된 제목" },
 * });
 */
export function useUpdateNote(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: Partial<Omit<Note, "id" | "createdAt">> }) =>
      updateNoteApi(noteId, updates),

    // 낙관적 업데이트: 서버 응답 전에 UI 즉시 업데이트
    onMutate: async ({ noteId, updates }) => {
      // 진행 중인 쿼리 취소 (충돌 방지)
      await queryClient.cancelQueries({ queryKey: ["notes", noteId] });

      // 이전 값 백업 (롤백용)
      const previousNote = queryClient.getQueryData<Note>(["notes", noteId]);

      // 낙관적 업데이트 적용
      if (previousNote) {
        queryClient.setQueryData<Note>(["notes", noteId], {
          ...previousNote,
          ...updates,
          updatedAt: Date.now(),
        });
      }

      // 노트 목록도 낙관적 업데이트
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          ["notes"],
          previousNotes.map((note) =>
            note.id === noteId
              ? { ...note, ...updates, updatedAt: Date.now() }
              : note
          )
        );
      }

      // 롤백을 위한 이전 값 반환
      return { previousNote, previousNotes };
    },

    // 에러 발생 시 롤백
    onError: (err, variables, context: any) => {
      if (context?.previousNote) {
        queryClient.setQueryData(["notes", variables.noteId], context.previousNote);
      }
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes"], context.previousNotes);
      }

      options?.onError?.(err);
    },

    // 성공 시 재검증
    onSuccess: () => {
      // 노트 목록 재검증
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      options?.onSuccess?.();
    },
  });
}

/**
 * 노트 삭제 뮤테이션 (낙관적 업데이트)
 *
 * @example
 * const deleteNote = useDeleteNote({
 *   onSuccess: () => {
 *     router.push("/dashboard/main");
 *   },
 * });
 * deleteNote.mutate("note-123");
 */
export function useDeleteNote(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNoteApi,

    // 낙관적 업데이트: 즉시 UI에서 제거
    onMutate: async (noteId) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ["notes"] });

      // 이전 값 백업
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      // 낙관적 업데이트: 노트 목록에서 제거
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          ["notes"],
          previousNotes.filter((note) => note.id !== noteId)
        );
      }

      // 개별 노트 캐시 제거
      queryClient.removeQueries({ queryKey: ["notes", noteId] });

      return { previousNotes };
    },

    // 에러 발생 시 롤백
    onError: (err, noteId, context: any) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes"], context.previousNotes);
      }

      options?.onError?.(err);
    },

    // 성공 시 재검증
    onSuccess: () => {
      // 노트 목록 재검증 (서버와 동기화)
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      options?.onSuccess?.();
    },
  });
}

/**
 * 여러 노트 일괄 삭제 뮤테이션
 *
 * @example
 * const deleteManyNotes = useDeleteManyNotes();
 * deleteManyNotes.mutate(["note-1", "note-2", "note-3"]);
 */
export function useDeleteManyNotes(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteIds: string[]) => {
      // 모든 노트 삭제를 병렬로 실행
      await Promise.all(noteIds.map((id) => deleteNoteApi(id)));
    },

    onMutate: async (noteIds) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });

      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          ["notes"],
          previousNotes.filter((note) => !noteIds.includes(note.id))
        );
      }

      // 개별 노트 캐시 제거
      noteIds.forEach((noteId) => {
        queryClient.removeQueries({ queryKey: ["notes", noteId] });
      });

      return { previousNotes };
    },

    onError: (err, noteIds, context: any) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes"], context.previousNotes);
      }

      options?.onError?.(err);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      options?.onSuccess?.();
    },
  });
}

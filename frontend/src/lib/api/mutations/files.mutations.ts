/**
 * 파일 업로드/삭제 작업을 위한 useMutation 훅
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UploadResult } from "../services/files.api"; // ✅ Type moved to V2
import {
  saveFile as saveFileApi,
  saveMultipleFiles as saveMultipleFilesApi,
  deleteFile as deleteNoteFileApi,
} from "../services/files.api"; // ✅ V2 API로 변경
import type { DBFile } from "@/lib/db/files";

// ============================================================================
// 노트 파일 작업 (V2 - IndexedDB + 동기화 큐)
// ============================================================================

/**
 * 노트 파일 저장 뮤테이션
 *
 * @example
 * const saveFile = useSaveNoteFile({
 *   onSuccess: () => {
 *     notify.success("저장 완료", "파일이 저장되었습니다.");
 *   },
 * });
 * saveFile.mutate({ noteId: "note-123", file });
 */
export function useSaveNoteFile(
  options?: {
    onSuccess?: (data: DBFile) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, file }: { noteId: string; file: File }) =>
      saveFileApi(noteId, file),

    onSuccess: (data, variables) => {
      // Invalidate all file queries for this note (both withId and without)
      queryClient.invalidateQueries({
        queryKey: ["files", "note", variables.noteId],
        exact: false, // Invalidate all queries starting with this prefix
      });
      options?.onSuccess?.(data);
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * 노트 다중 파일 저장 뮤테이션
 *
 * @example
 * const saveFiles = useSaveMultipleNoteFiles({
 *   onSuccess: (files) => {
 *     notify.success("저장 완료", `${files.length}개 파일이 저장되었습니다.`);
 *   },
 * });
 * saveFiles.mutate({ noteId: "note-123", files: [file1, file2] });
 */
export function useSaveMultipleNoteFiles(
  options?: {
    onSuccess?: (data: DBFile[]) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, files }: { noteId: string; files: File[] }) =>
      saveMultipleFilesApi(noteId, files),

    onSuccess: (data, variables) => {
      // Invalidate all file queries for this note (both withId and without)
      queryClient.invalidateQueries({
        queryKey: ["files", "note", variables.noteId],
        exact: false, // Invalidate all queries starting with this prefix
      });
      options?.onSuccess?.(data);
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * 노트 파일 삭제 뮤테이션
 *
 * @example
 * const deleteFile = useDeleteNoteFile({
 *   onSuccess: () => {
 *     notify.success("삭제 완료", "파일이 삭제되었습니다.");
 *   },
 * });
 * deleteFile.mutate({ fileId: "file-123", noteId: "note-123" });
 */
export function useDeleteNoteFile(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId }: { fileId: string; noteId: string }) =>
      deleteNoteFileApi(fileId),

    onSuccess: (_, variables) => {
      // Invalidate all file queries for this note (both withId and without)
      queryClient.invalidateQueries({
        queryKey: ["files", "note", variables.noteId],
        exact: false, // Invalidate all queries starting with this prefix
      });
      options?.onSuccess?.();
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

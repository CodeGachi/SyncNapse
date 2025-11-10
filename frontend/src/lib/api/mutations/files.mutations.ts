/**
 * useMutation hooks for file upload/delete operations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UploadResult } from "../services/files.api.v2"; // ✅ Type moved to V2
import {
  saveFile as saveFileApi,
  saveMultipleFiles as saveMultipleFilesApi,
  deleteFile as deleteNoteFileApi,
} from "../services/files.api.v2"; // ✅ V2 API로 변경
import type { DBFile } from "@/lib/db/files";

// ============================================================================
// Note-specific file operations (V2 - IndexedDB + Sync Queue)
// ============================================================================

/**
 * Note File Save Muta tion * * @example  * const saveFile = useSaveNoteFile({
 *   onSuccess: () => {
 * notify.success("Save Complete", "File Savecompleted."); * }, * });  * saveFile.mutate({ noteId: "note-123", file });
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
      // Relevant Note File List Invalidate queryClient.invalidateQueries({ queryKey: ["files", "note", variables.noteId] });       options?.onSuccess?.(data);
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
* Note Multiple File Save Muta tion * * @example * const saveFiles = useSaveMultipleNoteFiles({ *   onSuccess: (files) => {
 * notify.success("Save Complete", `${files.length} File Savecompleted.`); * }, * });  * saveFiles.mutate({ noteId: "note-123", files: [file1, file2] });
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
      // Relevant Note File List Invalidate queryClient.invalidateQueries({ queryKey: ["files", "note", variables.noteId] });       options?.onSuccess?.(data);
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Note File Delete Muta tion * * @example  * const deleteFile = useDeleteNoteFile({
 *   onSuccess: () => {
 * notify.success("Delete Complete", "File Deletecompleted."); * }, * });  * deleteFile.mutate({ fileId: "file-123", noteId: "note-123" });
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
      // Relevant Note File List Invalidate queryClient.invalidateQueries({ queryKey: ["files", "note", variables.noteId] });       options?.onSuccess?.();
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

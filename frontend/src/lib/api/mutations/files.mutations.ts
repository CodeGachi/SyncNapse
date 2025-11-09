/**
 * useMutation hooks for file upload/delete operations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadFile,
  uploadFilesParallel,
  deleteFile as deleteFileGeneric,
  type UploadResult,
  type FileUploadResult,
} from "../files.api"; // ⚠️ Deprecated standalone upload API (consider removing)
import {
  saveFile as saveFileApi,
  saveMultipleFiles as saveMultipleFilesApi,
  deleteFile as deleteNoteFileApi,
} from "../services/files.api.v2"; // ✅ V2 API로 변경
import type { DBFile } from "@/lib/db/files";

/**
 * Single file upload mutation
 *
 * @example
 * const uploadSingleFile = useUploadFile({
 *   onSuccess: (result) => {
 *     console.log("Upload complete:", result);
 *   },
 * });
 *
 * uploadSingleFile.mutate(file);
 */
export function useUploadFile(options?: {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      signal,
    }: {
      file: File;
      signal?: AbortSignal;
    }) => {
      return uploadFile(file, signal);
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      options?.onSuccess?.(result);
    },

    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Multiple file upload mutations (parallel)
 *
 * @example
 * const uploadFilesParallel = useUploadFilesParallel({
 *   maxConcurrent: 3,
 *   onSuccess: (results) => {
 *     const successful = results.filter(r => r.success);
 *     const failed = results.filter(r => !r.success);
 *     console.log(`Complete: ${successful.length}, Failure: ${failed.length}`);
 *   },
 * });
 *
 * uploadFilesParallel.mutate(files);
 */
export function useUploadFilesParallel(options?: {
  maxConcurrent?: number;
  onSuccess?: (results: FileUploadResult[]) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      return uploadFilesParallel(files, options?.maxConcurrent);
    },

    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      options?.onSuccess?.(results);
    },

    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Delete file mutation
 *
 * @example
 * const deleteFileMutation = useDeleteFile({
 *   onSuccess: () => {
 *     console.log("File Delete Complete");
 *   },
 * });
 *
 * deleteFileMutation.mutate("file-123");
 */
export function useDeleteFile(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFileGeneric,

    // Optimistic deletion
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: ["files"] });

      const previousFiles = queryClient.getQueryData<UploadResult[]>(["files"]);

      if (previousFiles) {
        queryClient.setQueryData<UploadResult[]>(
          ["files"],
          previousFiles.filter((file) => file.id !== fileId)
        );
      }

      return { previousFiles };
    },

    // Error handling
    onError: (error: Error, fileId, context: any) => {
      if (context?.previousFiles) {
        queryClient.setQueryData(["files"], context.previousFiles);
      }

      options?.onError?.(error);
    },

    // Success handling
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });

      options?.onSuccess?.();
    },
  });
}

// ============================================================================
// Note-specific file operations (services/files.api.ts)
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

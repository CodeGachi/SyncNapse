/**
 * File upload hook
 */

import { useState, useCallback } from "react";
import { useUploadFilesParallel } from "@/lib/api/mutations/files.mutations";
import type { UploadResult } from "@/lib/api/files.api";

export interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
  result?: UploadResult;
}


export interface UseFileUploadOptions {
  maxConcurrent?: number;
  onFileComplete?: (file: FileUploadItem) => void;
  onFileError?: (file: FileUploadItem, error: Error) => void;
  onAllComplete?: (results: UploadResult[]) => void;
}

/**
 * File upload hook
 *
 * @example
 * const {
 *   files,
 *   addFiles,
 *   removeFile,
 *   startUpload,
 *   cancelAll,
 *   isUploading,
 * } = useFileUpload({
 *   maxConcurrent: 3,
 *   onAllComplete: (results) => {
 *     console.log("모든 파일 업로드 완료:", results);
 *   },
 * });
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxConcurrent = 3,
    onFileComplete,
    onFileError,
    onAllComplete,
  } = options;

  const [files, setFiles] = useState<FileUploadItem[]>([]);

  const uploadMutation = useUploadFilesParallel({
    maxConcurrent,
    onSuccess: (results) => {
      setFiles((prev) =>
        prev.map((file) => {
          // Find result based on file object
          const uploadResult = results.find((r) => r.file === file.file);

          if (!uploadResult) {
            // If no upload result is found (not uploaded)
            return file;
          }

          if (uploadResult.success && uploadResult.result) {
            const updatedFile = {
              ...file,
              progress: 100,
              status: "completed" as const,
              result: uploadResult.result,
            };

            if (onFileComplete) {
              onFileComplete(updatedFile);
            }

            return updatedFile;
          } else if (!uploadResult.success) {
            const error = uploadResult.error || new Error("Unknown error");
            const updatedFile = {
              ...file,
              status: "error" as const,
              error: error.message,
            };

            if (onFileError) {
              onFileError(updatedFile, error);
            }

            return updatedFile;
          }

          return file;
        })
      );

      // Return results for all files (including both success and failure)
      if (onAllComplete) {
        const successfulResults = results
          .filter((r) => r.success && r.result)
          .map((r) => r.result as UploadResult);
        onAllComplete(successfulResults);
      }
    },
    onError: (error) => {
      setFiles((prev) =>
        prev.map((file) => {
          if (file.status === "uploading" || file.status === "pending") {
            const updatedFile = {
              ...file,
              status: "error" as const,
              error: error.message,
            };

            if (onFileError) {
              onFileError(updatedFile, error);
            }

            return updatedFile;
          }
          return file;
        })
      );
    },
  });

  /**
   * Add files
   */
  const addFiles = useCallback((newFiles: File[]) => {
    const uploadItems: FileUploadItem[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));

    setFiles((prev) => [...prev, ...uploadItems]);
    return uploadItems;
  }, []);

  /**
   * Remove file
   */
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  /**
   * Start upload
   */
  const startUpload = useCallback(() => {
    const filesToUpload = files
      .filter((f) => f.status === "pending" || f.status === "error")
      .map((f) => f.file);

    if (filesToUpload.length === 0) {
      return;
    }

    // Start upload
    setFiles((prev) =>
      prev.map((file) =>
        file.status === "pending" || file.status === "error"
          ? { ...file, status: "uploading" as const, error: undefined }
          : file
      )
    );

    uploadMutation.mutate(filesToUpload);
  }, [files, uploadMutation]);

  /**
   * Cancel all uploads
   */
  const cancelAll = useCallback(() => {
    uploadMutation.reset();
    setFiles([]);
  }, [uploadMutation]);

  /**
   * Remove completed files
   */
  const clearCompleted = useCallback(() => {
    setFiles((prev) =>
      prev.filter(
        (f) =>
          f.status !== "completed" &&
          f.status !== "error" &&
          f.status !== "cancelled"
      )
    );
  }, []);

  /**
   * Retry failed files
   */
  const retryFailed = useCallback(() => {
    setFiles((prev) =>
      prev.map((file) =>
        file.status === "error"
          ? { ...file, status: "pending" as const, error: undefined, progress: 0 }
          : file
      )
    );
  }, []);

  return {
    files,
    isUploading: uploadMutation.isPending,

    addFiles,
    removeFile,
    startUpload,
    cancelAll,
    clearCompleted,
    retryFailed,
  };
}

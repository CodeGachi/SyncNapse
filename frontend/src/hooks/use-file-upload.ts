/**
 * 파일 업로드 훅 (V2 - IndexedDB + 동기화 큐)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("FileUpload");
import { saveMultipleFiles as saveMultipleFilesApi } from "@/lib/api/services/files.api";
import type { UploadResult } from "@/lib/api/services/files.api";
import type { DBFile } from "@/lib/db/files";

export interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
  result?: UploadResult;
}


export interface UseFileUploadOptions {
  noteId?: string; // V2: Required for saving to specific note
  maxConcurrent?: number;
  onFileComplete?: (file: FileUploadItem) => void;
  onFileError?: (file: FileUploadItem, error: Error) => void;
  onAllComplete?: (results: UploadResult[]) => void;
}

/**
 * File upload hook (V2 - IndexedDB + Sync Queue)
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
 *   noteId: "note-123",
 *   maxConcurrent: 3,
 *   onAllComplete: (results) => {
 *     console.log("모든 파일 업로드 완료:", results);
 *   },
 * });
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    noteId,
    maxConcurrent = 3,
    onFileComplete,
    onFileError,
    onAllComplete,
  } = options;

  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const filesRef = useRef<FileUploadItem[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

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
    const fileToRemove = files.find((f) => f.id === fileId);

    // URL cleanup handled elsewhere - FileUploadItem doesn't store URL

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, [files]);

  /**
   * Start upload (V2 - Direct API call)
   * When noteId is provided, uploads files to the note.
   * When noteId is not provided, just stages files in the queue.
   */
  const startUpload = useCallback(async () => {
    // If noteId is not provided, just stage files without uploading
    if (!noteId) {
      log.warn("noteId 미제공. 파일이 준비되었지만 업로드되지 않음. 업로드하려면 noteId를 제공하세요.");
      return;
    }

    // Get files to upload from ref (always has latest state)
    const filesToUpload = filesRef.current
      .filter((f) => f.status === "pending" || f.status === "error")
      .map((f) => f.file);

    if (filesToUpload.length === 0) {
      return;
    }

    // Update status to uploading
    setFiles((prev) =>
      prev.map((file) =>
        file.status === "pending" || file.status === "error"
          ? { ...file, status: "uploading" as const, error: undefined, progress: 0 }
          : file
      )
    );

    setIsUploading(true);

    try {
      // Call V2 API directly to save files
      const dbResults = await saveMultipleFilesApi(noteId, filesToUpload);

      // Convert DBFile[] to UploadResult[] for hook API compatibility
      const results: UploadResult[] = dbResults.map((dbFile: DBFile) => ({
        id: dbFile.id,
        name: dbFile.fileName,
        url: "", // URL would be created by backend when syncing
        size: dbFile.size,
        type: dbFile.fileType,
        uploadedAt: new Date(dbFile.createdAt).toISOString(),
      }));

      // Update files with results
      setFiles((prev) =>
        prev.map((file) => {
          const result = results.find(
            (r) => r.name === file.file.name && r.size === file.file.size
          );

          if (!result) {
            return file;
          }

          const updatedFile = {
            ...file,
            progress: 100,
            status: "completed" as const,
            result,
          };

          if (onFileComplete) {
            onFileComplete(updatedFile);
          }

          return updatedFile;
        })
      );

      // Call onAllComplete with successful results
      if (onAllComplete) {
        onAllComplete(results);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");

      // Update files with error status
      setFiles((prev) =>
        prev.map((file) => {
          if (file.status === "uploading" || file.status === "pending") {
            const updatedFile = {
              ...file,
              status: "error" as const,
              error: err.message,
            };

            if (onFileError) {
              onFileError(updatedFile, err);
            }

            return updatedFile;
          }
          return file;
        })
      );
    } finally {
      setIsUploading(false);
    }
  }, [noteId, onFileComplete, onFileError, onAllComplete]);

  /**
   * Cancel all uploads
   */
  const cancelAll = useCallback(() => {
    setIsUploading(false);
    setFiles([]);
  }, []);

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
    isUploading, // Now using local state instead of mutation state

    addFiles,
    removeFile,
    startUpload,
    cancelAll,
    clearCompleted,
    retryFailed,
  };
}

/**
 * 파일 업로드 훅 (TanStack Query 기반)
 *
 * 기존 use-upload-queue.ts를 대체하는 새로운 업로드 훅
 * TanStack Query를 사용하여 상태 관리 및 에러 처리를 자동화
 */

import { useState, useCallback, useRef } from "react";
import { useUploadFilesParallel } from "@/lib/api/mutations/files.mutations";
import type { UploadResult, UploadProgress } from "@/lib/api/files.api";

export interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
  result?: UploadResult;
}

export interface FileUploadStats {
  total: number;
  pending: number;
  uploading: number;
  completed: number;
  error: number;
  cancelled: number;
  totalProgress: number;
}

export interface UseFileUploadOptions {
  maxConcurrent?: number;
  onFileComplete?: (file: FileUploadItem) => void;
  onFileError?: (file: FileUploadItem, error: Error) => void;
  onAllComplete?: (results: UploadResult[]) => void;
}

/**
 * 파일 업로드 훅
 *
 * @example
 * const {
 *   files,
 *   stats,
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
  const progressMapRef = useRef<Map<number, number>>(new Map());

  // TanStack Query 뮤테이션
  const uploadMutation = useUploadFilesParallel({
    maxConcurrent,
    onProgress: (fileIndex, progress) => {
      progressMapRef.current.set(fileIndex, progress.percentage);

      setFiles((prev) =>
        prev.map((file, index) =>
          index === fileIndex
            ? {
                ...file,
                progress: progress.percentage,
                status: "uploading" as const,
              }
            : file
        )
      );
    },
    onSuccess: (results) => {
      setFiles((prev) =>
        prev.map((file, index) => {
          const result = results[index];
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

      if (onAllComplete) {
        onAllComplete(results);
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
   * 파일 추가
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
   * 파일 제거
   */
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  /**
   * 업로드 시작
   */
  const startUpload = useCallback(() => {
    const filesToUpload = files
      .filter((f) => f.status === "pending" || f.status === "error")
      .map((f) => f.file);

    if (filesToUpload.length === 0) {
      return;
    }

    progressMapRef.current.clear();
    uploadMutation.mutate(filesToUpload);
  }, [files, uploadMutation]);

  /**
   * 모든 업로드 취소
   */
  const cancelAll = useCallback(() => {
    uploadMutation.reset();
    setFiles([]);
    progressMapRef.current.clear();
  }, [uploadMutation]);

  /**
   * 완료된 파일 제거
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
   * 실패한 파일 재시도
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

  /**
   * 통계 계산
   */
  const stats: FileUploadStats = {
    total: files.length,
    pending: files.filter((f) => f.status === "pending").length,
    uploading: files.filter((f) => f.status === "uploading").length,
    completed: files.filter((f) => f.status === "completed").length,
    error: files.filter((f) => f.status === "error").length,
    cancelled: files.filter((f) => f.status === "cancelled").length,
    totalProgress:
      files.length > 0
        ? files.reduce((sum, f) => sum + f.progress, 0) / files.length
        : 0,
  };

  return {
    // 상태
    files,
    stats,
    isUploading: uploadMutation.isPending,

    // 액션
    addFiles,
    removeFile,
    startUpload,
    cancelAll,
    clearCompleted,
    retryFailed,
  };
}

/**
 * 파일 업로드 관련 TanStack Query Mutations
 *
 * 파일 업로드/삭제 작업을 위한 useMutation 훅들
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadFile,
  uploadFiles,
  uploadFilesParallel,
  deleteFile,
  type UploadResult,
  type UploadProgress,
} from "../files.api";

/**
 * 단일 파일 업로드 뮤테이션
 *
 * @example
 * const uploadSingleFile = useUploadFile({
 *   onProgress: (progress) => {
 *     console.log(`업로드 진행: ${progress.percentage}%`);
 *   },
 *   onSuccess: (result) => {
 *     console.log("업로드 완료:", result);
 *   },
 * });
 *
 * uploadSingleFile.mutate(file);
 */
export function useUploadFile(options?: {
  onProgress?: (progress: UploadProgress) => void;
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
      return uploadFile(file, options?.onProgress, signal);
    },

    onSuccess: (result) => {
      // 파일 목록 캐시 무효화 (필요한 경우)
      queryClient.invalidateQueries({ queryKey: ["files"] });

      options?.onSuccess?.(result);
    },

    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * 여러 파일 업로드 뮤테이션 (순차)
 *
 * @example
 * const uploadMultipleFiles = useUploadFiles({
 *   onProgress: (fileIndex, progress) => {
 *     console.log(`파일 ${fileIndex + 1} 업로드 진행: ${progress.percentage}%`);
 *   },
 * });
 *
 * uploadMultipleFiles.mutate(files);
 */
export function useUploadFiles(options?: {
  onProgress?: (fileIndex: number, progress: UploadProgress) => void;
  onSuccess?: (results: UploadResult[]) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      signal,
    }: {
      files: File[];
      signal?: AbortSignal;
    }) => {
      return uploadFiles(files, options?.onProgress, signal);
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
 * 여러 파일 업로드 뮤테이션 (병렬)
 *
 * @example
 * const uploadFilesParallel = useUploadFilesParallel({
 *   maxConcurrent: 3,
 *   onProgress: (fileIndex, progress) => {
 *     console.log(`파일 ${fileIndex + 1}: ${progress.percentage}%`);
 *   },
 * });
 *
 * uploadFilesParallel.mutate(files);
 */
export function useUploadFilesParallel(options?: {
  maxConcurrent?: number;
  onProgress?: (fileIndex: number, progress: UploadProgress) => void;
  onSuccess?: (results: UploadResult[]) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      return uploadFilesParallel(
        files,
        options?.onProgress,
        options?.maxConcurrent
      );
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
 * 파일 삭제 뮤테이션
 *
 * @example
 * const deleteFileMutation = useDeleteFile({
 *   onSuccess: () => {
 *     console.log("파일 삭제 완료");
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
    mutationFn: deleteFile,

    // 낙관적 삭제
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

    // 에러 시 롤백
    onError: (error: Error, fileId, context: any) => {
      if (context?.previousFiles) {
        queryClient.setQueryData(["files"], context.previousFiles);
      }

      options?.onError?.(error);
    },

    // 성공 시 재검증
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });

      options?.onSuccess?.();
    },
  });
}

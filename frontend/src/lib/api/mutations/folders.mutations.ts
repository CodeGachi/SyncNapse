/**
 * 폴더 관련 TanStack Query Mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFolderApi,
  updateFolderApi,
  deleteFolderApi,
} from "../folders.api";
import type { Folder } from "@/lib/types";

/**
 * 폴더 생성 뮤테이션
 */
export function useCreateFolder(options?: {
  onSuccess?: (data: Folder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolderApi,
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.setQueryData(["folders", newFolder.id], newFolder);

      options?.onSuccess?.(newFolder);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * 폴더 수정 뮤테이션
 */
export function useUpdateFolder(options?: {
  onSuccess?: (data: Folder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      folderId,
      updates,
    }: {
      folderId: string;
      updates: Partial<Omit<Folder, "id">>;
    }) => updateFolderApi(folderId, updates),

    onMutate: async ({ folderId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["folders", folderId] });

      const previousFolder = queryClient.getQueryData<Folder>(["folders", folderId]);

      if (previousFolder) {
        queryClient.setQueryData<Folder>(["folders", folderId], {
          ...previousFolder,
          ...updates,
        });
      }

      const previousFolders = queryClient.getQueryData<Folder[]>(["folders"]);
      if (previousFolders) {
        queryClient.setQueryData<Folder[]>(
          ["folders"],
          previousFolders.map((folder) =>
            folder.id === folderId ? { ...folder, ...updates } : folder
          )
        );
      }

      return { previousFolder, previousFolders };
    },

    onError: (err: Error, variables, context: any) => {
      if (context?.previousFolder) {
        queryClient.setQueryData(["folders", variables.folderId], context.previousFolder);
      }
      if (context?.previousFolders) {
        queryClient.setQueryData(["folders"], context.previousFolders);
      }

      options?.onError?.(err);
    },

    onSuccess: (updatedFolder) => {
      queryClient.setQueryData(["folders", updatedFolder.id], updatedFolder);
      queryClient.invalidateQueries({ queryKey: ["folders"] });

      options?.onSuccess?.(updatedFolder);
    },
  });
}

/**
 * 폴더 삭제 뮤테이션
 */
export function useDeleteFolder(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolderApi,

    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: ["folders"] });

      const previousFolders = queryClient.getQueryData<Folder[]>(["folders"]);

      if (previousFolders) {
        queryClient.setQueryData<Folder[]>(
          ["folders"],
          previousFolders.filter((folder) => folder.id !== folderId)
        );
      }

      queryClient.removeQueries({ queryKey: ["folders", folderId] });

      return { previousFolders };
    },

    onError: (err: Error, folderId, context: any) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(["folders"], context.previousFolders);
      }

      options?.onError?.(err);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // 폴더에 속한 노트도 갱신

      options?.onSuccess?.();
    },
  });
}

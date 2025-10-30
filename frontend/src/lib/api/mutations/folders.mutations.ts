/**
 * 폴더 관련 TanStack Query Mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFolder as createFolderApi,
  renameFolder as renameFolderApi,
  deleteFolder as deleteFolderApi,
} from "../client/folders.api";
import type { DBFolder } from "@/lib/db/folders";

/**
 * 폴더 생성 뮤테이션
 */
export function useCreateFolder(options?: {
  onSuccess?: (data: DBFolder) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      createFolderApi(name, parentId),
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
 * 폴더 수정 뮤테이션 (이름 변경)
 */
export function useUpdateFolder(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      folderId,
      newName,
    }: {
      folderId: string;
      newName: string;
    }) => renameFolderApi(folderId, newName),

    onMutate: async ({ folderId, newName }) => {
      await queryClient.cancelQueries({ queryKey: ["folders", folderId] });

      const previousFolder = queryClient.getQueryData<DBFolder>(["folders", folderId]);

      if (previousFolder) {
        queryClient.setQueryData<DBFolder>(["folders", folderId], {
          ...previousFolder,
          name: newName,
          updatedAt: Date.now(),
        });
      }

      const previousFolders = queryClient.getQueryData<DBFolder[]>(["folders"]);
      if (previousFolders) {
        queryClient.setQueryData<DBFolder[]>(
          ["folders"],
          previousFolders.map((folder) =>
            folder.id === folderId
              ? { ...folder, name: newName, updatedAt: Date.now() }
              : folder
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

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });

      options?.onSuccess?.();
    },
  });
}

/**
 * 폴더 삭제 뮤테이션 (휴지통으로 이동)
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

      const previousFolders = queryClient.getQueryData<DBFolder[]>(["folders"]);

      if (previousFolders) {
        queryClient.setQueryData<DBFolder[]>(
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

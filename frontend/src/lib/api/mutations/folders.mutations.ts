/**
 * 폴더 관련 TanStack Query 뮤테이션
 */ 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFolder as createFolderApi,
  renameFolder as renameFolderApi,
  deleteFolder as deleteFolderApi,
} from "../services/folders.api"; // ✅ V2 API로 변경
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

      const previousFolder = queryClient.getQueryData<Folder>(["folders", folderId]);

      if (previousFolder) {
        queryClient.setQueryData<Folder>(["folders", folderId], {
          ...previousFolder,
          name: newName,
          updatedAt: Date.now(),
        });
      }

      const previousFolders = queryClient.getQueryData<Folder[]>(["folders"]);
      if (previousFolders) {
        queryClient.setQueryData<Folder[]>(
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
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // Folder Note 갱신
      options?.onSuccess?.();
    },
  });
}

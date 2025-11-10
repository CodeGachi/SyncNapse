/**
 * Folder management hook
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createFolder as createFolderApi,
  renameFolder as renameFolderApi,
  deleteFolder as deleteFolderApi,
  moveFolder as moveFolderApi,
  fetchFolderPath,
} from "@/lib/api/services/folders.api"; // ✅ Updated to V2
import { useFoldersQuery } from "@/lib/api/queries/folders.queries";
import type { DBFolder } from "@/lib/db/folders";

export function useFolders() {
  const queryClient = useQueryClient();

  // Fetch folder list with TanStack Query (automatic caching and synchronization)
  const { data: folders = [], isLoading, error } = useFoldersQuery();

  // Create folder
  const handleCreateFolder = async (
    name: string,
    parentId: string | null = null
  ) => {
    try {
      await createFolderApi(name, parentId);

      // Invalidate cache to fetch the latest data across all components
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 생성에 실패했습니다."
      );
    }
  };

  // Rename folder
  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await renameFolderApi(folderId, newName);

      // Invalidate cache to fetch the latest data across all components
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 이름 변경에 실패했습니다."
      );
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolderApi(folderId);

      // Invalidate cache to fetch the latest data across all components
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 삭제에 실패했습니다."
      );
    }
  };

  // Move folder
  const handleMoveFolder = async (
    folderId: string,
    newParentId: string | null
  ) => {
    try {
      await moveFolderApi(folderId, newParentId);

      // Invalidate cache to fetch the latest data across all components
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 이동에 실패했습니다."
      );
    }
  };

  // Get subfolders of a specific folder
  const getSubFolders = (parentId: string | null): DBFolder[] => {
    return folders.filter((f) => f.parentId === parentId);
  };

  // Build folder tree structure
  const buildFolderTree = (
    parentId: string | null = null
  ): FolderTreeNode[] => {
    const subFolders = getSubFolders(parentId);
    return subFolders.map((folder) => ({
      folder,
      children: buildFolderTree(folder.id),
    }));
  };

  // Get folder path
  const getPath = async (folderId: string): Promise<DBFolder[]> => {
    return await fetchFolderPath(folderId);
  };

  // Manual refresh (if needed)
  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  return {
    folders,
    isLoading,
    error: error ? error.message : null,
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    moveFolder: handleMoveFolder,
    getSubFolders,
    buildFolderTree,
    getFolderPath: getPath,
    reload,
  };
}

export interface FolderTreeNode {
  folder: DBFolder;
  children: FolderTreeNode[];
}

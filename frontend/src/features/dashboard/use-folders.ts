/**
 * 폴더 관리 훅 (TanStack Query 사용)
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createFolder as createFolderApi,
  renameFolder as renameFolderApi,
  deleteFolder as deleteFolderApi,
  moveFolder as moveFolderApi,
  fetchFolderPath,
} from "@/lib/api/client/folders.api";
import { useFoldersQuery } from "@/lib/api/queries/folders.queries";
import type { DBFolder } from "@/lib/db/folders";

export function useFolders() {
  const queryClient = useQueryClient();

  // TanStack Query로 폴더 목록 가져오기 (자동 캐싱 및 동기화)
  const { data: folders = [], isLoading, error } = useFoldersQuery();

  // 폴더 생성
  const handleCreateFolder = async (
    name: string,
    parentId: string | null = null
  ) => {
    try {
      await createFolderApi(name, parentId);

      // 캐시 무효화하여 모든 컴포넌트에서 최신 데이터 가져오기
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 생성에 실패했습니다."
      );
    }
  };

  // 폴더 이름 변경
  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await renameFolderApi(folderId, newName);

      // 캐시 무효화하여 모든 컴포넌트에서 최신 데이터 가져오기
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 이름 변경에 실패했습니다."
      );
    }
  };

  // 폴더 삭제
  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolderApi(folderId);

      // 캐시 무효화하여 모든 컴포넌트에서 최신 데이터 가져오기
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 삭제에 실패했습니다."
      );
    }
  };

  // 폴더 이동
  const handleMoveFolder = async (
    folderId: string,
    newParentId: string | null
  ) => {
    try {
      await moveFolderApi(folderId, newParentId);

      // 캐시 무효화하여 모든 컴포넌트에서 최신 데이터 가져오기
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 이동에 실패했습니다."
      );
    }
  };

  // 특정 폴더의 하위 폴더들 가져오기
  const getSubFolders = (parentId: string | null): DBFolder[] => {
    return folders.filter((f) => f.parentId === parentId);
  };

  // 폴더 트리 구조 생성
  const buildFolderTree = (
    parentId: string | null = null
  ): FolderTreeNode[] => {
    const subFolders = getSubFolders(parentId);
    return subFolders.map((folder) => ({
      folder,
      children: buildFolderTree(folder.id),
    }));
  };

  // 폴더 경로 가져오기
  const getPath = async (folderId: string): Promise<DBFolder[]> => {
    return await fetchFolderPath(folderId);
  };

  // 수동 새로고침 (필요시)
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

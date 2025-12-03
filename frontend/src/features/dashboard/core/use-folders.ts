/**
 * 폴더 관리 훅
 * 폴더 생성, 이름 변경, 삭제, 이동, 트리 구조 기능 제공
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createFolder as createFolderApi,
  renameFolder as renameFolderApi,
  deleteFolder as deleteFolderApi,
  moveFolder as moveFolderApi,
  fetchFolderPath,
} from "@/lib/api/services/folders.api"; 
import { useFoldersQuery } from "@/lib/api/queries/folders.queries";
import type { DBFolder } from "@/lib/db/folders";

export function useFolders() {
  const queryClient = useQueryClient();

  // TanStack Query로 폴더 목록 조회 (자동 캐싱 및 동기화)
  const { data: folders = [], isLoading, error } = useFoldersQuery();

  // 폴더 생성
  const handleCreateFolder = async (
    name: string,
    parentId: string | null = null
  ) => {
    try {
      await createFolderApi(name, parentId);

      // 캐시 무효화하여 최신 데이터 조회
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

      // 캐시 무효화하여 최신 데이터 조회
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

      // 캐시 무효화하여 최신 데이터 조회
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

      // 캐시 무효화하여 최신 데이터 조회
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "폴더 이동에 실패했습니다."
      );
    }
  };

  // "Root" 폴더 찾기 (name이 "Root"이고 parentId가 null인 시스템 폴더)
  const rootFolder = folders.find((f) => f.name === "Root" && f.parentId === null);

  // 특정 폴더의 하위 폴더 조회
  const getSubFolders = (parentId: string | null): DBFolder[] => {
    return folders.filter((f) => f.parentId === parentId);
  };

  // Root부터 시작하는 폴더 트리 구조 생성
  const buildFolderTree = (
    parentId: string | null = null
  ): FolderTreeNode[] => {
    // parentId가 null이면 Root 폴더부터 시작
    if (parentId === null && rootFolder) {
      return [{
        folder: rootFolder,
        children: buildFolderTreeRecursive(rootFolder.id),
      }];
    }

    return buildFolderTreeRecursive(parentId);
  };

  // 트리 구조 재귀 생성 헬퍼
  const buildFolderTreeRecursive = (parentId: string | null): FolderTreeNode[] => {
    const subFolders = getSubFolders(parentId);
    return subFolders.map((folder) => ({
      folder,
      children: buildFolderTreeRecursive(folder.id),
    }));
  };

  // 폴더 경로 조회
  const getPath = async (folderId: string): Promise<DBFolder[]> => {
    return await fetchFolderPath(folderId);
  };

  // 수동 새로고침
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

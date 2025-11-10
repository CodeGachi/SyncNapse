/**
 * Folders API Service V2 - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * 새로운 구조:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 동기화 큐에 추가
 * 3. 백그라운드에서 백엔드와 동기화
 */

import type { Folder } from "@/lib/types";
import {
  getAllFolders as getAllFoldersFromDB,
  getFoldersByParent as getFoldersByParentFromDB,
  createFolder as createFolderInDB,
  renameFolder as renameFolderInDB,
  deleteFolder as deleteFolderInDB,
  moveFolder as moveFolderInDB,
  getFolderPath as getFolderPathFromDB,
} from "@/lib/db/folders";
import { useSyncStore } from "@/lib/sync/sync-store";

/**
 * 모든 폴더 가져오기
 * - IndexedDB에서 즉시 반환
 */
export async function fetchAllFolders(): Promise<Folder[]> {
  const dbFolders = await getAllFoldersFromDB();
  return dbFolders as Folder[];
}

/**
 * 특정 폴더의 하위 폴더 가져오기
 */
export async function fetchFoldersByParent(
  parentId: string | null
): Promise<Folder[]> {
  const dbFolders = await getFoldersByParentFromDB(parentId);
  return dbFolders as Folder[];
}

/**
 * 폴더 생성
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<Folder> {
  // 1. IndexedDB에 즉시 저장
  const dbFolder = await createFolderInDB(name, parentId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "folder",
    entityId: dbFolder.id,
    operation: "create",
    data: {
      name: dbFolder.name,
      parent_id: dbFolder.parentId,
      created_at: new Date(dbFolder.createdAt).toISOString(),
      updated_at: new Date(dbFolder.updatedAt).toISOString(),
    },
  });

  // 3. 즉시 반환
  return dbFolder as Folder;
}

/**
 * 폴더 이름 변경
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  // 1. IndexedDB에 즉시 저장
  await renameFolderInDB(folderId, newName);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "folder",
    entityId: folderId,
    operation: "update",
    data: {
      name: newName,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * 폴더 삭제
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 */
export async function deleteFolder(folderId: string): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  await deleteFolderInDB(folderId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "folder",
    entityId: folderId,
    operation: "delete",
  });
}

/**
 * 폴더 이동
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  // 1. IndexedDB에 즉시 저장
  await moveFolderInDB(folderId, newParentId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "folder",
    entityId: folderId,
    operation: "update",
    data: {
      parent_id: newParentId,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * 폴더 경로 가져오기
 * - IndexedDB에서 즉시 반환
 */
export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  const dbFolders = await getFolderPathFromDB(folderId);
  return dbFolders as Folder[];
}

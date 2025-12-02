/**
 * 폴더 API 서비스
 * - 도메인 타입(Folder) 반환
 * - IndexedDB와 백엔드 API 추상화
 * - 어댑터를 통한 타입 변환
 */

import { createLogger } from "@/lib/utils/logger";
import type { Folder } from "@/lib/types";

const log = createLogger("FoldersAPI");
import type { ApiFolderResponse } from "../types/api.types";
import {
  getAllFolders as getAllFoldersFromDB,
  getFoldersByParent as getFoldersByParentFromDB,
  createFolder as createFolderInDB,
  updateFolder as updateFolderIdInDB,
  renameFolder as renameFolderInDB,
  deleteFolder as deleteFolderInDB,
  moveFolder as moveFolderInDB,
  getFolderPath as getFolderPathFromDB,
  checkDuplicateFolderName,
} from "@/lib/db/folders";
import { dbToFolder, dbToFolders, apiToFolder, apiToFolders } from "../adapters/folder.adapter";
import { getAuthHeaders } from "../client";
// import { getSyncQueue } from "@/lib/sync"; // TODO: Use useSyncStore instead

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * 모든 폴더 가져오기
 * 로컬 데이터를 즉시 반환하고 백그라운드에서 서버와 동기화
 * @returns 도메인 폴더 배열
 */
export async function fetchAllFolders(): Promise<Folder[]> {
  // 1. 로컬 데이터 우선 반환 (빠른 응답)
  const dbFolders = await getAllFoldersFromDB();
  const localFolders = dbToFolders(dbFolders);

  // 2. 백그라운드에서 서버 동기화
  syncFoldersInBackground(localFolders);

  return localFolders;
}

/**
 * 백그라운드 폴더 동기화
 */
async function syncFoldersInBackground(localFolders: Folder[]): Promise<void> {
  try {
    // 서버에서 최신 데이터 가져오기
    const res = await fetch(`${API_BASE_URL}/api/folders`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });
    
    if (!res.ok) {
      log.warn('Failed to fetch from server for sync:', res.status);
      return;
    }
    
    const apiFolders: ApiFolderResponse[] = await res.json();
    const serverFolders = apiToFolders(apiFolders);

    // 동기화할 데이터 찾기
    const { syncFolders } = await import('../sync-utils');
    const { toUpdate, toAdd, toDelete } = await syncFolders(localFolders, serverFolders);

    // Root 폴더는 삭제하지 않음 (보호)
    const filteredToDelete = toDelete.filter(id => {
      const folder = localFolders.find(f => f.id === id);
      return !(folder?.name === "Root" && folder?.parentId === null);
    });

    // IndexedDB 업데이트
    if (toUpdate.length > 0 || toAdd.length > 0 || filteredToDelete.length > 0) {
      const { saveFolder, permanentlyDeleteFolder } = await import('@/lib/db/folders');
      const { folderToDb } = await import('../adapters/folder.adapter');

      // toUpdate와 toAdd 모두 saveFolder로 처리 (put 메서드 사용)
      const allToSave = [...toUpdate, ...toAdd];

      for (const folder of allToSave) {
        const dbFolder = folderToDb(folder);
        await saveFolder(dbFolder);
      }

      // toDelete 처리 - 서버에서 삭제된 폴더는 로컬에서도 영구 삭제 (Root 제외)
      for (const folderId of filteredToDelete) {
        await permanentlyDeleteFolder(folderId);
      }

      log.info(`✅ Synced ${toUpdate.length} updates, ${toAdd.length} new, ${filteredToDelete.length} deleted folders from server`);

      // React Query cache 무효화 (다음 쿼리에서 최신 데이터 가져오도록)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('folders-synced'));
      }
    }
  } catch (error) {
    log.error('Background sync failed:', error);
  }
}

/**
 * 특정 폴더의 하위 폴더 가져오기
 * @returns 도메인 폴더 배열
 */
export async function fetchFoldersByParent(
  parentId: string | null
): Promise<Folder[]> {
  if (USE_LOCAL) {
    const dbFolders = await getFoldersByParentFromDB(parentId);
    return dbToFolders(dbFolders);
  } else {
    const url = parentId
      ? `${API_BASE_URL}/api/folders?parentId=${parentId}`
      : `${API_BASE_URL}/api/folders?parentId=null`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(), // Add JWT token for authentication
      },
    });
    if (!res.ok) throw new Error("Failed to fetch folders");
    const apiFolders: ApiFolderResponse[] = await res.json();
    return apiToFolders(apiFolders);
  }
}

/**
 * 폴더 생성
 * IndexedDB에 즉시 저장 후 백엔드와 병렬 동기화
 * @returns 생성된 도메인 폴더
 */
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<Folder> {
  // Check for duplicate name in the same parent folder
  const isDuplicate = await checkDuplicateFolderName(name, parentId);
  if (isDuplicate) {
    const parentLabel = parentId ? "이 폴더" : "루트 폴더";
    throw new Error(`${parentLabel}에 이미 같은 이름의 폴더가 있습니다: "${name}"`);
  }

  let localResult: Folder | null = null;
  let folderId: string | null = null;

  // 1. Save to IndexedDB immediately (fast local storage)
  try {
    const dbFolder = await createFolderInDB(name, parentId);
    folderId = dbFolder.id; // Use this ID for both local and backend
    localResult = dbToFolder(dbFolder);
    log.debug(`Folder saved to IndexedDB with ID:`, folderId);
  } catch (error) {
    log.error("Failed to save to IndexedDB:", error);
  }

  // 2. Sync to backend in parallel (don't wait for it)
  const syncToBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ 
          id: folderId, // Send the same ID to backend
          name, 
          parent_id: parentId 
        }), 
      });

      if (!res.ok) throw new Error("Failed to create folder on backend");

      const backendFolder: ApiFolderResponse = await res.json();
      log.info(`✅ Folder synced to backend:`, name, `ID: ${backendFolder.id}`);

      return backendFolder;
    } catch (error) {
      log.error("Failed to sync to backend:", error);
      // TODO: Implement retry queue using useSyncStore
      // getSyncQueue().addTask('folder-create', { id: folderId, name, parent_id: parentId });
      return null;
    }
  };

  // Start background sync (non-blocking)
  syncToBackend();

  // Return local result immediately
  if (localResult) {
    return localResult;
  }

  // If IndexedDB failed, try API as last resort
  const res = await fetch(`${API_BASE_URL}/api/folders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ name, parent_id: parentId }), 
  });

  if (!res.ok) throw new Error("Failed to create folder");
  const apiFolder: ApiFolderResponse = await res.json();
  return apiToFolder(apiFolder);
}

/**
 * 폴더 이름 변경
 * IndexedDB에서 즉시 이름 변경 후 백엔드와 동기화
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  // 1. Rename in IndexedDB immediately
  try {
    await renameFolderInDB(folderId, newName);
    log.debug(`Folder renamed in IndexedDB:`, newName);
  } catch (error) {
    log.error("Failed to rename in IndexedDB:", error);
  }

  // 2. Sync to backend in parallel
  const syncToBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/folders/${folderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error("Failed to rename folder on backend");
      log.info(`Folder rename synced to backend:`, newName);
    } catch (error) {
      log.error("Failed to sync rename to backend:", error);
      // 재시도 큐에 추가
      // TODO: Implement retry queue using useSyncStore
      // getSyncQueue().addTask('folder-update', { id: folderId, updates: { name: newName } });
    }
  };

  // Start background sync
  syncToBackend();
}

/**
 * 폴더 삭제
 * IndexedDB에서 즉시 삭제 후 백엔드와 동기화
 */
export async function deleteFolder(folderId: string): Promise<void> {
  // 1. Delete from IndexedDB immediately
  try {
    await deleteFolderInDB(folderId);
    log.debug(`Folder deleted from IndexedDB:`, folderId);
  } catch (error) {
    log.error("Failed to delete from IndexedDB:", error);
  }

  // 2. Sync to backend in parallel
  const syncToBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/folders/${folderId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
      });

      // DEBUG: Log response status
      log.debug(`Delete folder response status: ${res.status}`);
      
      // 404는 이미 삭제된 것으로 간주하고 에러로 처리하지 않음
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete folder: ${res.statusText}`);
      }

      log.info(`Folder deletion synced to backend:`, folderId);
    } catch (error) {
      log.error("Failed to sync deletion to backend:", error);
      // 404 에러가 아닌 경우에만 재시도 큐에 추가
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('404')) {
        // TODO: Implement retry queue using useSyncStore
        // getSyncQueue().addTask('folder-delete', { id: folderId });
      }
    }
  };

  // Start background sync
  syncToBackend();
}

/**
 * 폴더 이동
 * IndexedDB에서 즉시 이동 후 백엔드와 동기화
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  // 1. Move in IndexedDB immediately
  try {
    await moveFolderInDB(folderId, newParentId);
    log.debug(`Folder moved in IndexedDB:`, folderId);
  } catch (error) {
    log.error("Failed to move in IndexedDB:", error);
  }

  // 2. Sync to backend in parallel
  const syncToBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/folders/${folderId}/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ parentId: newParentId }),
      });

      if (!res.ok) throw new Error("Failed to move folder on backend");
      log.info(`Folder move synced to backend:`, folderId);
    } catch (error) {
      log.error("Failed to sync move to backend:", error);
      // 재시도 큐에 추가
      // TODO: Implement retry queue using useSyncStore
      // getSyncQueue().addTask('folder-move', { id: folderId, newParentId });
    }
  };

  // Start background sync
  syncToBackend();
}

/**
 * 폴더 경로 가져오기
 * @returns 도메인 폴더 배열 (루트에서 현재 폴더까지)
 */
export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  if (USE_LOCAL) {
    const dbFolders = await getFolderPathFromDB(folderId);
    return dbToFolders(dbFolders);
  } else {
    const res = await fetch(`${API_BASE_URL}/api/folders/${folderId}/path`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(), // Add JWT token for authentication
      },
    });
    if (!res.ok) throw new Error("Failed to fetch folder path");
    const apiFolders: ApiFolderResponse[] = await res.json();
    return apiToFolders(apiFolders);
  }
}

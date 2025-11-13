/**
 * Folders API Service
 * - Returns domain type (Folder)
 * - Abstracts IndexedDB and Backend API
 * - Converts types through adapter
 */

import type { Folder } from "@/lib/types";
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
import { getSyncQueue } from "../sync-queue";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Get all folders
 * Returns local data immediately, then syncs with server in background
 * @returns Main folder array
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
 * Background folder synchronization
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
      console.warn('[folders.api] Failed to fetch from server for sync:', res.status);
      return;
    }
    
    const apiFolders: ApiFolderResponse[] = await res.json();
    const serverFolders = apiToFolders(apiFolders);
    
    // 동기화할 데이터 찾기
    const { syncFolders } = await import('../sync-utils');
    const { toUpdate, toAdd, toDelete } = await syncFolders(localFolders, serverFolders);
    
    // IndexedDB 업데이트
    if (toUpdate.length > 0 || toAdd.length > 0 || toDelete.length > 0) {
      const { saveFolder, permanentlyDeleteFolder } = await import('@/lib/db/folders');
      const { folderToDb } = await import('../adapters/folder.adapter');
      
      // toUpdate와 toAdd 모두 saveFolder로 처리 (put 메서드 사용)
      const allToSave = [...toUpdate, ...toAdd];
      
      for (const folder of allToSave) {
        const dbFolder = folderToDb(folder);
        await saveFolder(dbFolder);
      }
      
      // toDelete 처리 - 서버에서 삭제된 폴더는 로컬에서도 영구 삭제
      for (const folderId of toDelete) {
        await permanentlyDeleteFolder(folderId);
      }
      
      console.log(`[folders.api] ✅ Synced ${toUpdate.length} updates, ${toAdd.length} new, ${toDelete.length} deleted folders from server`);
      
      // React Query cache 무효화 (다음 쿼리에서 최신 데이터 가져오도록)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('folders-synced'));
      }
    }
  } catch (error) {
    console.error('[folders.api] Background sync failed:', error);
  }
}

/**
 * Get subfolders of a specific folder
 * @returns Main folder array
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
 * Create folder
 * Saves to IndexedDB immediately, then syncs to backend in parallel
 * @returns Created domain Folder
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
    console.log(`[folders.api] Folder saved to IndexedDB with ID:`, folderId);
  } catch (error) {
    console.error("[folders.api] Failed to save to IndexedDB:", error);
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
      console.log(`[folders.api] ✅ Folder synced to backend:`, name, `ID: ${backendFolder.id}`);
      
      return backendFolder;
    } catch (error) {
      console.error("[folders.api] Failed to sync to backend:", error);
      // 재시도 큐에 추가
      getSyncQueue().addTask('folder-create', { id: folderId, name, parent_id: parentId });
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
 * Rename folder
 * Renames in IndexedDB immediately, then syncs to backend
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  // 1. Rename in IndexedDB immediately
  try {
    await renameFolderInDB(folderId, newName);
    console.log(`[folders.api] Folder renamed in IndexedDB:`, newName);
  } catch (error) {
    console.error("[folders.api] Failed to rename in IndexedDB:", error);
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
      console.log(`[folders.api] Folder rename synced to backend:`, newName);
    } catch (error) {
      console.error("[folders.api] Failed to sync rename to backend:", error);
      // 재시도 큐에 추가
      getSyncQueue().addTask('folder-update', { id: folderId, updates: { name: newName } });
    }
  };

  // Start background sync
  syncToBackend();
}

/**
 * Delete folder
 * Deletes from IndexedDB immediately, then syncs to backend
 */
export async function deleteFolder(folderId: string): Promise<void> {
  // 1. Delete from IndexedDB immediately
  try {
    await deleteFolderInDB(folderId);
    console.log(`[folders.api] Folder deleted from IndexedDB:`, folderId);
  } catch (error) {
    console.error("[folders.api] Failed to delete from IndexedDB:", error);
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
      console.log(`[folders.api] Delete folder response status: ${res.status}`);
      
      // 404는 이미 삭제된 것으로 간주하고 에러로 처리하지 않음
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete folder: ${res.statusText}`);
      }
      
      console.log(`[folders.api] Folder deletion synced to backend:`, folderId);
    } catch (error) {
      console.error("[folders.api] Failed to sync deletion to backend:", error);
      // 404 에러가 아닌 경우에만 재시도 큐에 추가
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('404')) {
        getSyncQueue().addTask('folder-delete', { id: folderId });
      }
    }
  };

  // Start background sync
  syncToBackend();
}

/**
 * Move folder
 * Moves in IndexedDB immediately, then syncs to backend
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  // 1. Move in IndexedDB immediately
  try {
    await moveFolderInDB(folderId, newParentId);
    console.log(`[folders.api] Folder moved in IndexedDB:`, folderId);
  } catch (error) {
    console.error("[folders.api] Failed to move in IndexedDB:", error);
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
      console.log(`[folders.api] Folder move synced to backend:`, folderId);
    } catch (error) {
      console.error("[folders.api] Failed to sync move to backend:", error);
      // 재시도 큐에 추가
      getSyncQueue().addTask('folder-move', { id: folderId, newParentId });
    }
  };

  // Start background sync
  syncToBackend();
}

/**
 * Get folder path
 * @returns Array of domain Folders (from root to current folder)
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

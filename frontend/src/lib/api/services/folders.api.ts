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
 * @returns Main folder array
 */
export async function fetchAllFolders(): Promise<Folder[]> {
  if (USE_LOCAL) {
    const dbFolders = await getAllFoldersFromDB();
    return dbToFolders(dbFolders); // 🔄 IndexedDB → Main Type Conversion
  } else {
    const res = await fetch(`${API_BASE_URL}/api/folders`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(), // Add JWT token for authentication
      },
    });
    if (!res.ok) throw new Error("Failed to fetch folders");
    const apiFolders: ApiFolderResponse[] = await res.json();
    return apiToFolders(apiFolders); // 🔄 Backend API → Main Type Conversion
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

      if (!res.ok) throw new Error("Failed to delete folder on backend");
      console.log(`[folders.api] Folder deletion synced to backend:`, folderId);
    } catch (error) {
      console.error("[folders.api] Failed to sync deletion to backend:", error);
      // 재시도 큐에 추가
      getSyncQueue().addTask('folder-delete', { id: folderId });
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

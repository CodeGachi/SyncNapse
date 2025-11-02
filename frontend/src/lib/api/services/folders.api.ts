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
  renameFolder as renameFolderInDB,
  deleteFolder as deleteFolderInDB,
  moveFolder as moveFolderInDB,
  getFolderPath as getFolderPathFromDB,
} from "@/lib/db/folders";
import { dbToFolder, dbToFolders, apiToFolder, apiToFolders } from "../adapters/folder.adapter";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * Get all folders
 * @returns Main folder array
 */
export async function fetchAllFolders(): Promise<Folder[]> {
  if (USE_LOCAL) {
    const dbFolders = await getAllFoldersFromDB();
    return dbToFolders(dbFolders); // 🔄 IndexedDB → Main Type Conversion
  } else {
    const res = await fetch("/api/folders");
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
      ? `/api/folders?parentId=${parentId}`
      : "/api/folders?parentId=null";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch folders");
    const apiFolders: ApiFolderResponse[] = await res.json();
    return apiToFolders(apiFolders);
  }
}

/**
 * Create folder
 * @returns Created domain Folder
 */
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<Folder> {
  if (USE_LOCAL) {
    const dbFolder = await createFolderInDB(name, parentId);
    return dbToFolder(dbFolder);
  } else {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id: parentId }), 
    });

    if (!res.ok) throw new Error("Failed to create folder");
    const apiFolder: ApiFolderResponse = await res.json();
    return apiToFolder(apiFolder);
  }
}

/**
 * Rename folder
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  if (USE_LOCAL) {
    await renameFolderInDB(folderId, newName);
  } else {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) throw new Error("Failed to rename folder");
  }
}

/**
 * Delete folder
 */
export async function deleteFolder(folderId: string): Promise<void> {
  if (USE_LOCAL) {
    await deleteFolderInDB(folderId);
  } else {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete folder");
  }
}

/**
 * Move folder
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  if (USE_LOCAL) {
    await moveFolderInDB(folderId, newParentId);
  } else {
    const res = await fetch(`/api/folders/${folderId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: newParentId }),
    });

    if (!res.ok) throw new Error("Failed to move folder");
  }
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
    const res = await fetch(`/api/folders/${folderId}/path`);
    if (!res.ok) throw new Error("Failed to fetch folder path");
    const apiFolders: ApiFolderResponse[] = await res.json();
    return apiToFolders(apiFolders);
  }
}

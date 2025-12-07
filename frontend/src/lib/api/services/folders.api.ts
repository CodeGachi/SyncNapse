/**
 * Folders API Service (HATEOAS)
 * - Uses HAL links for API navigation
 * - Domain types (Folder) returned
 * - IndexedDB and Backend API abstracted
 */

import { createLogger } from "@/lib/utils/logger";
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
import {
  dbToFolder,
  dbToFolders,
  apiToFolder,
  apiToFolders,
} from "../adapters/folder.adapter";
import {
  halFetchUrl,
  getRootUrl,
  HalResource,
  HalError,
  getApiBaseUrl,
  storeResourceLinks,
} from "../hal";

const log = createLogger("FoldersAPI");
const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

// HAL Resource types
interface FolderResource extends HalResource, ApiFolderResponse {}
interface FoldersListResource extends HalResource {
  items: FolderResource[];
  count: number;
}

// ==========================================
// URL Builders (HATEOAS)
// ==========================================

async function getFoldersUrl(parentId?: string | null): Promise<string> {
  const baseUrl = await getRootUrl("folders");
  const url = baseUrl || `${getApiBaseUrl()}/folders`;
  
  if (parentId !== undefined) {
    return `${url}?parentId=${parentId === null ? "null" : parentId}`;
  }
  return url;
}

async function getFolderUrl(folderId: string): Promise<string> {
  // Try templated link first
  const templateUrl = await getRootUrl("folderById", { folderId });
  if (templateUrl) return templateUrl;

  // Fallback
  const baseUrl = await getRootUrl("folders");
  return baseUrl ? `${baseUrl}/${folderId}` : `${getApiBaseUrl()}/folders/${folderId}`;
}

// ==========================================
// Folders API Functions (HATEOAS)
// ==========================================

/**
 * Fetch all folders
 * Returns local data immediately, syncs with server in background
 */
export async function fetchAllFolders(): Promise<Folder[]> {
  // 1. Return local data first (fast response)
  const dbFolders = await getAllFoldersFromDB();
  const localFolders = dbToFolders(dbFolders);

  // 2. Background server sync
  syncFoldersInBackground(localFolders);

  return localFolders;
}

/**
 * Background folder synchronization
 */
async function syncFoldersInBackground(localFolders: Folder[]): Promise<void> {
  try {
    const url = await getFoldersUrl();
    const response = await halFetchUrl<FoldersListResource>(url, { method: "GET" });

    const apiFolders = Array.isArray(response)
      ? response
      : response.items || response;
    const serverFolders = apiToFolders(apiFolders as ApiFolderResponse[]);

    // Find data to sync
    const { syncFolders } = await import("../sync-utils");
    const { toUpdate, toAdd, toDelete } = await syncFolders(
      localFolders,
      serverFolders
    );

    // Don't delete Root folder (protected)
    const filteredToDelete = toDelete.filter((id) => {
      const folder = localFolders.find((f) => f.id === id);
      return !(folder?.name === "Root" && folder?.parentId === null);
    });

    // Update IndexedDB
    if (
      toUpdate.length > 0 ||
      toAdd.length > 0 ||
      filteredToDelete.length > 0
    ) {
      const { saveFolder, permanentlyDeleteFolder } = await import(
        "@/lib/db/folders"
      );
      const { folderToDb } = await import("../adapters/folder.adapter");

      const allToSave = [...toUpdate, ...toAdd];

      for (const folder of allToSave) {
        const dbFolder = folderToDb(folder);
        await saveFolder(dbFolder);
      }

      for (const folderId of filteredToDelete) {
        await permanentlyDeleteFolder(folderId);
      }

      log.info(
        `✅ Synced ${toUpdate.length} updates, ${toAdd.length} new, ${filteredToDelete.length} deleted folders from server`
      );

      // Invalidate React Query cache
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("folders-synced"));
      }
    }
  } catch (error) {
    log.error("Background sync failed:", error);
  }
}

/**
 * Fetch folders by parent
 */
export async function fetchFoldersByParent(
  parentId: string | null
): Promise<Folder[]> {
  if (USE_LOCAL) {
    const dbFolders = await getFoldersByParentFromDB(parentId);
    return dbToFolders(dbFolders);
  } else {
    const url = await getFoldersUrl(parentId);
    const response = await halFetchUrl<FoldersListResource>(url, {
      method: "GET",
    });

    const apiFolders = Array.isArray(response)
      ? response
      : response.items || response;
    return apiToFolders(apiFolders as ApiFolderResponse[]);
  }
}

/**
 * Create folder
 * Saves to IndexedDB immediately, syncs to backend in background
 */
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<Folder> {
  // Check for duplicate name
  const isDuplicate = await checkDuplicateFolderName(name, parentId);
  if (isDuplicate) {
    const parentLabel = parentId ? "이 폴더" : "루트 폴더";
    throw new Error(`${parentLabel}에 이미 같은 이름의 폴더가 있습니다: "${name}"`);
  }

  let localResult: Folder | null = null;
  let folderId: string | null = null;

  // 1. Save to IndexedDB immediately
  try {
    const dbFolder = await createFolderInDB(name, parentId);
    folderId = dbFolder.id;
    localResult = dbToFolder(dbFolder);
    log.debug(`Folder saved to IndexedDB with ID:`, folderId);
  } catch (error) {
    log.error("Failed to save to IndexedDB:", error);
  }

  // 2. Sync to backend in background
  const syncToBackend = async () => {
    try {
      const url = await getFoldersUrl();
      const response = await halFetchUrl<FolderResource>(url, {
        method: "POST",
        body: JSON.stringify({ 
          id: folderId,
          name, 
          parent_id: parentId,
        }), 
      });

      log.info(`✅ Folder synced to backend:`, name, `ID: ${response.id}`);

      // Store links from created folder
      if (response._links) {
        storeResourceLinks("folder", response.id, response);
      }

      return response;
    } catch (error) {
      log.error("Failed to sync to backend:", error);
      return null;
    }
  };

  // Start background sync
  syncToBackend();

  // Return local result immediately
  if (localResult) {
    return localResult;
  }

  // If IndexedDB failed, call API directly
  const url = await getFoldersUrl();
  const response = await halFetchUrl<FolderResource>(url, {
    method: "POST",
    body: JSON.stringify({ name, parent_id: parentId }), 
  });

  return apiToFolder(response);
}

/**
 * Rename folder
 * Renames in IndexedDB immediately, syncs to backend in background
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

  // 2. Sync to backend in background
  const syncToBackend = async () => {
    try {
      const url = await getFolderUrl(folderId);
      await halFetchUrl<FolderResource>(url, {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
      });
      log.info(`Folder rename synced to backend:`, newName);
    } catch (error) {
      log.error("Failed to sync rename to backend:", error);
    }
  };

  syncToBackend();
}

/**
 * Delete folder
 * Deletes from IndexedDB immediately, syncs to backend in background
 */
export async function deleteFolder(folderId: string): Promise<void> {
  // 1. Delete from IndexedDB immediately
  try {
    await deleteFolderInDB(folderId);
    log.debug(`Folder deleted from IndexedDB:`, folderId);
  } catch (error) {
    log.error("Failed to delete from IndexedDB:", error);
  }

  // 2. Sync to backend in background
  const syncToBackend = async () => {
    try {
      const url = await getFolderUrl(folderId);
      await halFetchUrl<HalResource>(url, { method: "DELETE" });

      log.info(`Folder deletion synced to backend:`, folderId);
    } catch (error) {
      // 404 means already deleted, don't treat as error
      if (error instanceof HalError && error.status === 404) {
        log.debug(`Folder already deleted on backend:`, folderId);
        return;
      }
      log.error("Failed to sync deletion to backend:", error);
    }
  };

  syncToBackend();
}

/**
 * Move folder
 * Moves in IndexedDB immediately, syncs to backend in background
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

  // 2. Sync to backend in background
  const syncToBackend = async () => {
    try {
      const url = `${await getFolderUrl(folderId)}/move`;
      await halFetchUrl<FolderResource>(url, {
        method: "PATCH",
        body: JSON.stringify({ parentId: newParentId }),
      });
      log.info(`Folder move synced to backend:`, folderId);
    } catch (error) {
      log.error("Failed to sync move to backend:", error);
    }
  };

  syncToBackend();
}

/**
 * Fetch folder path
 * @returns Domain folder array (from root to current folder)
 */
export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  if (USE_LOCAL) {
    const dbFolders = await getFolderPathFromDB(folderId);
    return dbToFolders(dbFolders);
  } else {
    const url = `${await getFolderUrl(folderId)}/path`;
    const response = await halFetchUrl<FoldersListResource>(url, {
      method: "GET",
    });

    const apiFolders = Array.isArray(response)
      ? response
      : response.items || response;
    return apiToFolders(apiFolders as ApiFolderResponse[]);
  }
}

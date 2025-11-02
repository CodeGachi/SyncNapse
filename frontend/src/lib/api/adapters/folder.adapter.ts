/**
 * Folder Adapter
 * Converts folder types from IndexedDB and Backend API to domain types
 */
import type { Folder } from "@/lib/types";
import type { DBFolder } from "@/lib/db";
import type { ApiFolderResponse, ApiFolderCreateRequest } from "../types/api.types";

// ============================================================================
// IndexedDB → Domain type conversion
// ============================================================================

/**
 * Convert IndexedDB folder to domain folder
 */
export function dbToFolder(dbFolder: DBFolder): Folder {
  return {
    id: dbFolder.id,
    name: dbFolder.name,
    parentId: dbFolder.parentId,
    createdAt: dbFolder.createdAt,
    updatedAt: dbFolder.updatedAt,
  };
}

/**
 * Convert an array of IndexedDB folders to an array of domain folders
 */
export function dbToFolders(dbFolders: DBFolder[]): Folder[] {
  return dbFolders.map(dbToFolder);
}

// ============================================================================
// Backend API → Domain type conversion
// ============================================================================

/**
 * Convert Backend API folder response to domain folder
 */
export function apiToFolder(apiFolder: ApiFolderResponse): Folder {
  return {
    id: apiFolder.id,
    name: apiFolder.name,
    parentId: apiFolder.parent_id,
    createdAt: new Date(apiFolder.created_at).getTime(),
    updatedAt: new Date(apiFolder.updated_at).getTime(),
  };
}

/**
 * Convert an array of Backend API folders to an array of domain folders
 */
export function apiToFolders(apiFolders: ApiFolderResponse[]): Folder[] {
  return apiFolders.map(apiToFolder);
}

// ============================================================================
// Domain type → Backend API request conversion
// ============================================================================

/**
 * Convert domain folder to Backend API create request
 */
export function toApiFolderCreateRequest(
  name: string,
  parentId: string | null
): ApiFolderCreateRequest {
  return {
    name,
    parent_id: parentId,
  };
}

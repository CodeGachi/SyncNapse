/**
 * 폴더 어댑터
 * IndexedDB와 백엔드 API의 폴더 타입을 도메인 타입으로 변환
 */
import type { Folder } from "@/lib/types";
import type { DBFolder } from "@/lib/db";
import type { ApiFolderResponse, ApiFolderCreateRequest } from "../types/api.types";

// ============================================================================
// IndexedDB → 도메인 타입 변환
// ============================================================================

/**
 * IndexedDB 폴더를 도메인 폴더로 변환
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
 * IndexedDB 폴더 배열을 도메인 폴더 배열로 변환
 */
export function dbToFolders(dbFolders: DBFolder[]): Folder[] {
  return dbFolders.map(dbToFolder);
}

/**
 * 도메인 폴더를 IndexedDB 폴더로 변환
 */
export function folderToDb(folder: Folder): DBFolder {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

// ============================================================================
// 백엔드 API → 도메인 타입 변환
// ============================================================================

/**
 * 백엔드 API 폴더 응답을 도메인 폴더로 변환
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
 * 백엔드 API 폴더 배열을 도메인 폴더 배열로 변환
 */
export function apiToFolders(apiFolders: ApiFolderResponse[]): Folder[] {
  return apiFolders.map(apiToFolder);
}

// ============================================================================
// 도메인 타입 → 백엔드 API 요청 변환
// ============================================================================

/**
 * 도메인 폴더를 백엔드 API 생성 요청으로 변환
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


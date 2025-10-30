/**
 * Folders API - Backend와 IndexedDB를 추상화
 */

import type { DBFolder } from "@/lib/db/folders";
import {
  getAllFolders as getAllFoldersFromDB,
  getFoldersByParent as getFoldersByParentFromDB,
  createFolder as createFolderInDB,
  renameFolder as renameFolderInDB,
  deleteFolder as deleteFolderInDB,
  moveFolder as moveFolderInDB,
  getFolderPath as getFolderPathFromDB,
} from "@/lib/db/folders";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * 모든 폴더 가져오기
 */
export async function fetchAllFolders(): Promise<DBFolder[]> {
  if (USE_LOCAL) {
    return await getAllFoldersFromDB();
  } else {
    // 백엔드 API 호출
    const res = await fetch("/api/folders");
    if (!res.ok) throw new Error("Failed to fetch folders");
    return await res.json();
  }
}

/**
 * 특정 폴더의 하위 폴더들 가져오기
 */
export async function fetchFoldersByParent(
  parentId: string | null
): Promise<DBFolder[]> {
  if (USE_LOCAL) {
    return await getFoldersByParentFromDB(parentId);
  } else {
    // 백엔드 API 호출
    const url = parentId
      ? `/api/folders?parentId=${parentId}`
      : "/api/folders?parentId=null";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch folders");
    return await res.json();
  }
}

/**
 * 폴더 생성
 */
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<DBFolder> {
  if (USE_LOCAL) {
    return await createFolderInDB(name, parentId);
  } else {
    // 백엔드 API 호출
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });

    if (!res.ok) throw new Error("Failed to create folder");
    return await res.json();
  }
}

/**
 * 폴더 이름 변경
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  if (USE_LOCAL) {
    await renameFolderInDB(folderId, newName);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) throw new Error("Failed to rename folder");
  }
}

/**
 * 폴더 삭제
 */
export async function deleteFolder(folderId: string): Promise<void> {
  if (USE_LOCAL) {
    await deleteFolderInDB(folderId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete folder");
  }
}

/**
 * 폴더 이동
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  if (USE_LOCAL) {
    await moveFolderInDB(folderId, newParentId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/folders/${folderId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: newParentId }),
    });

    if (!res.ok) throw new Error("Failed to move folder");
  }
}

/**
 * 폴더 경로 가져오기
 */
export async function fetchFolderPath(folderId: string): Promise<DBFolder[]> {
  if (USE_LOCAL) {
    return await getFolderPathFromDB(folderId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/folders/${folderId}/path`);
    if (!res.ok) throw new Error("Failed to fetch folder path");
    return await res.json();
  }
}

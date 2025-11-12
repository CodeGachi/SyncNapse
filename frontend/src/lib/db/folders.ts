/**
 * Folders IndexedDB - 폴더 관리
 */

import { openDB, type IDBPDatabase } from "idb";
import type { DBFolder } from "./schema";

const DB_NAME = "SyncNapseDB";
const STORE_NAME = "folders";

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1);
  }
  return dbPromise;
}

/**
 * 모든 폴더 가져오기
 */
export async function getAllFolders(): Promise<DBFolder[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * 특정 부모 폴더의 하위 폴더 가져오기
 */
export async function getFoldersByParent(
  parentId: string | null
): Promise<DBFolder[]> {
  const db = await getDB();
  const allFolders = await db.getAll(STORE_NAME);
  return allFolders.filter((folder) => folder.parentFolderId === parentId);
}

/**
 * 폴더 ID로 폴더 가져오기
 */
export async function getFolder(folderId: string): Promise<DBFolder | null> {
  const db = await getDB();
  const folder = await db.get(STORE_NAME, folderId);
  return folder || null;
}

/**
 * 폴더 생성
 */
export async function createFolder(
  name: string,
  color: string = "#6366f1",
  parentFolderId?: string
): Promise<DBFolder> {
  const db = await getDB();

  const folder: DBFolder = {
    id: crypto.randomUUID(),
    name,
    color,
    parentFolderId: parentFolderId || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isTrashed: false,
  };

  await db.add(STORE_NAME, folder);
  return folder;
}

/**
 * 폴더 업데이트
 */
export async function updateFolder(
  folderId: string,
  updates: Partial<Omit<DBFolder, "id" | "createdAt">>
): Promise<void> {
  const db = await getDB();
  const folder = await db.get(STORE_NAME, folderId);

  if (!folder) {
    throw new Error("폴더를 찾을 수 없습니다.");
  }

  const updatedFolder: DBFolder = {
    ...folder,
    ...updates,
    updatedAt: Date.now(),
  };

  await db.put(STORE_NAME, updatedFolder);
}

/**
 * 폴더를 휴지통으로 이동
 */
export async function moveFolderToTrash(folder: DBFolder): Promise<void> {
  const db = await getDB();

  const trashedFolder: DBFolder = {
    ...folder,
    isTrashed: true,
    trashedAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.put(STORE_NAME, trashedFolder);
}

/**
 * 폴더를 휴지통에서 복원
 */
export async function restoreFolderFromTrash(folderId: string): Promise<void> {
  const db = await getDB();
  const folder = await db.get(STORE_NAME, folderId);

  if (!folder) {
    throw new Error("폴더를 찾을 수 없습니다.");
  }

  const restoredFolder: DBFolder = {
    ...folder,
    isTrashed: false,
    trashedAt: undefined,
    updatedAt: Date.now(),
  };

  await db.put(STORE_NAME, restoredFolder);
}

/**
 * 폴더 영구 삭제
 */
export async function permanentlyDeleteFolder(folderId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, folderId);
}

/**
 * 휴지통의 모든 폴더 가져오기
 */
export async function getTrashedFolders(): Promise<DBFolder[]> {
  const db = await getDB();
  const allFolders = await db.getAll(STORE_NAME);
  return allFolders.filter((folder) => folder.isTrashed);
}

/**
 * 휴지통 비우기 (모든 폴더 영구 삭제)
 */
export async function emptyFolderTrash(): Promise<void> {
  const trashedFolders = await getTrashedFolders();
  for (const folder of trashedFolders) {
    await permanentlyDeleteFolder(folder.id);
  }
}

/**
 * 폴더 이름 중복 확인
 */
export async function isFolderNameDuplicate(
  name: string,
  parentFolderId: string | null,
  excludeFolderId?: string
): Promise<boolean> {
  const db = await getDB();
  const allFolders = await db.getAll(STORE_NAME);

  return allFolders.some(
    (folder) =>
      folder.name === name &&
      folder.parentFolderId === parentFolderId &&
      folder.id !== excludeFolderId &&
      !folder.isTrashed
  );
}

/**
 * 폴더 이동 (부모 폴더 변경)
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  const db = await getDB();
  const folder = await db.get(STORE_NAME, folderId);

  if (!folder) {
    throw new Error("폴더를 찾을 수 없습니다.");
  }

  // 순환 참조 방지
  if (newParentId && (await isDescendantOf(newParentId, folderId))) {
    throw new Error("하위 폴더로 이동할 수 없습니다.");
  }

  const movedFolder: DBFolder = {
    ...folder,
    parentFolderId: newParentId,
    updatedAt: Date.now(),
  };

  await db.put(STORE_NAME, movedFolder);
}

/**
 * 순환 참조 확인 (targetId가 sourceId의 하위 폴더인지 확인)
 */
async function isDescendantOf(
  targetId: string,
  sourceId: string
): Promise<boolean> {
  const db = await getDB();
  let currentId: string | null = targetId;

  while (currentId) {
    if (currentId === sourceId) {
      return true;
    }

    const folder = await db.get(STORE_NAME, currentId);
    currentId = folder?.parentFolderId || null;
  }

  return false;
}

/**
 * 폴더 삭제 (휴지통으로 이동, 하위 폴더와 노트도 함께)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const db = await getDB();

  // IndexedDB 트랜잭션 시작
  const folder = await new Promise<DBFolder>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(folderId);

    request.onsuccess = () => {
      if (!request.result) {
        reject(new Error("폴더를 찾을 수 없습니다."));
      } else {
        resolve(request.result as DBFolder);
      }
    };

    request.onerror = () => reject(new Error("폴더를 가져올 수 없습니다."));
  });

  // 하위 폴더들 재귀적으로 삭제
  const subFolders = await getFoldersByParent(folderId);
  for (const subFolder of subFolders) {
    await deleteFolder(subFolder.id);
  }

  // 폴더에 속한 노트들도 휴지통으로 이동
  const { deleteNotesByFolder } = await import('./notes');
  await deleteNotesByFolder(folderId);

  // 폴더를 휴지통으로 이동
  await moveFolderToTrash(folder);
}

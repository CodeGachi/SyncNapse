/**
 * 휴지통 DB 작업
 */

import { initDB } from "./index";
import type { DBTrashItem, DBFolder, DBNote } from "./index";

export type { DBTrashItem };

const DAYS_UNTIL_PERMANENT_DELETE = 15;

/**
 * 폴더를 휴지통으로 이동
 */
export async function moveFolderToTrash(folder: DBFolder): Promise<void> {
  const db = await initDB();
  const now = Date.now();
  const expiresAt = now + DAYS_UNTIL_PERMANENT_DELETE * 24 * 60 * 60 * 1000;

  const trashItem: DBTrashItem = {
    id: folder.id,
    type: "folder",
    data: folder,
    deletedAt: now,
    expiresAt,
  };

  const transaction = db.transaction(["trash", "folders"], "readwrite");
  const trashStore = transaction.objectStore("trash");
  const folderStore = transaction.objectStore("folders");

  // 휴지통에 추가
  await new Promise<void>((resolve, reject) => {
    const request = trashStore.add(trashItem);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 원래 폴더 삭제
  await new Promise<void>((resolve, reject) => {
    const request = folderStore.delete(folder.id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 노트를 휴지통으로 이동
 */
export async function moveNoteToTrash(note: DBNote): Promise<void> {
  const db = await initDB();
  const now = Date.now();
  const expiresAt = now + DAYS_UNTIL_PERMANENT_DELETE * 24 * 60 * 60 * 1000;

  const trashItem: DBTrashItem = {
    id: note.id,
    type: "note",
    data: note,
    deletedAt: now,
    expiresAt,
  };

  const transaction = db.transaction(["trash", "notes"], "readwrite");
  const trashStore = transaction.objectStore("trash");
  const noteStore = transaction.objectStore("notes");

  // 휴지통에 추가
  await new Promise<void>((resolve, reject) => {
    const request = trashStore.add(trashItem);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 원래 노트 삭제
  await new Promise<void>((resolve, reject) => {
    const request = noteStore.delete(note.id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 휴지통의 모든 아이템 가져오기
 */
export async function getAllTrashItems(): Promise<DBTrashItem[]> {
  const db = await initDB();
  const transaction = db.transaction("trash", "readonly");
  const store = transaction.objectStore("trash");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 휴지통 아이템 복구
 */
export async function restoreFromTrash(itemId: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["trash", "folders", "notes"], "readwrite");
  const trashStore = transaction.objectStore("trash");

  // 휴지통에서 아이템 가져오기
  const item = await new Promise<DBTrashItem>((resolve, reject) => {
    const request = trashStore.get(itemId);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        reject(new Error("Item not found in trash"));
      }
    };
    request.onerror = () => reject(request.error);
  });

  // 원래 위치로 복구
  if (item.type === "folder") {
    const folderStore = transaction.objectStore("folders");
    await new Promise<void>((resolve, reject) => {
      const request = folderStore.add(item.data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } else if (item.type === "note") {
    const noteStore = transaction.objectStore("notes");
    await new Promise<void>((resolve, reject) => {
      const request = noteStore.add(item.data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 휴지통에서 삭제
  await new Promise<void>((resolve, reject) => {
    const request = trashStore.delete(itemId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 휴지통에서 영구 삭제
 */
export async function permanentlyDeleteFromTrash(itemId: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction("trash", "readwrite");
  const store = transaction.objectStore("trash");

  return new Promise((resolve, reject) => {
    const request = store.delete(itemId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 만료된 아이템 자동 삭제
 */
export async function cleanupExpiredItems(): Promise<number> {
  const db = await initDB();
  const transaction = db.transaction("trash", "readwrite");
  const store = transaction.objectStore("trash");
  const index = store.index("expiresAt");
  const now = Date.now();

  // expiresAt이 현재 시간보다 작은 아이템들 찾기
  const range = IDBKeyRange.upperBound(now);

  return new Promise((resolve, reject) => {
    const request = index.openCursor(range);
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * 휴지통 비우기 (모든 아이템 영구 삭제)
 */
export async function emptyTrash(): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction("trash", "readwrite");
  const store = transaction.objectStore("trash");

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

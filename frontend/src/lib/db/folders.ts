/**
 * 폴더 관리 함수
 */

import { initDB } from "./index";
import type { DBFolder } from "./index";
import { v4 as uuidv4 } from "uuid";
import { moveFolderToTrash } from "./trash";

export type { DBFolder };

/**
 * 모든 폴더 가져오기
 */
export async function getAllFolders(): Promise<DBFolder[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readonly");
    const store = transaction.objectStore("folders");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("폴더 목록을 가져올 수 없습니다."));
    };
  });
}

/**
 * 특정 폴더의 하위 폴더들 가져오기
 */
export async function getFoldersByParent(
  parentId: string | null
): Promise<DBFolder[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readonly");
    const store = transaction.objectStore("folders");
    const index = store.index("parentId");
    const request = index.getAll(parentId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("하위 폴더를 가져올 수 없습니다."));
    };
  });
}

/**
 * 폴더 생성
 */
export async function createFolder(
  name: string,
  parentId: string | null = null
): Promise<DBFolder> {
  const db = await initDB();

  const folder: DBFolder = {
    id: uuidv4(),
    name,
    parentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readwrite");
    const store = transaction.objectStore("folders");
    const request = store.add(folder);

    request.onsuccess = () => {
      resolve(folder);
    };

    request.onerror = () => {
      reject(new Error(`폴더 생성 실패: ${request.error?.message || "Unknown error"}`));
    };
  });
}

/**
 * 폴더 이름 변경
 */
export async function renameFolder(
  folderId: string,
  newName: string
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readwrite");
    const store = transaction.objectStore("folders");
    const getRequest = store.get(folderId);

    getRequest.onsuccess = () => {
      const folder = getRequest.result as DBFolder;
      if (!folder) {
        reject(new Error("폴더를 찾을 수 없습니다."));
        return;
      }

      folder.name = newName;
      folder.updatedAt = Date.now();

      const updateRequest = store.put(folder);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(new Error("폴더 이름 변경 실패"));
    };

    getRequest.onerror = () => {
      reject(new Error("폴더를 가져올 수 없습니다."));
    };
  });
}

/**
 * 폴더 삭제 (휴지통으로 이동)
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const db = await initDB();

  // 폴더 정보 가져오기
  const folder = await new Promise<DBFolder>((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readonly");
    const store = transaction.objectStore("folders");
    const request = store.get(folderId);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        reject(new Error("폴더를 찾을 수 없습니다."));
      }
    };
    request.onerror = () => reject(new Error("폴더를 가져올 수 없습니다."));
  });

  // 휴지통으로 이동
  await moveFolderToTrash(folder);

  // 하위 폴더들도 휴지통으로 이동
  const subFolders = await getFoldersByParent(folderId);
  for (const subFolder of subFolders) {
    await deleteFolder(subFolder.id);
  }

  // TODO: 폴더에 속한 노트들도 휴지통으로 이동
}

/**
 * 폴더 영구 삭제 (휴지통에서 사용)
 */
export async function permanentlyDeleteFolder(folderId: string): Promise<void> {
  const db = await initDB();

  // 하위 폴더들 찾기
  const subFolders = await getFoldersByParent(folderId);

  // 재귀적으로 하위 폴더 영구 삭제
  for (const subFolder of subFolders) {
    await permanentlyDeleteFolder(subFolder.id);
  }

  // 폴더 자체 영구 삭제
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readwrite");
    const store = transaction.objectStore("folders");
    const request = store.delete(folderId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("폴더 영구 삭제 실패"));
  });
}

/**
 * 폴더 이동 (부모 폴더 변경)
 */
export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["folders"], "readwrite");
    const store = transaction.objectStore("folders");
    const getRequest = store.get(folderId);

    getRequest.onsuccess = () => {
      const folder = getRequest.result as DBFolder;
      if (!folder) {
        reject(new Error("폴더를 찾을 수 없습니다."));
        return;
      }

      folder.parentId = newParentId;
      folder.updatedAt = Date.now();

      const updateRequest = store.put(folder);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(new Error("폴더 이동 실패"));
    };

    getRequest.onerror = () => {
      reject(new Error("폴더를 가져올 수 없습니다."));
    };
  });
}

/**
 * 폴더 경로 가져오기 (breadcrumb용)
 */
export async function getFolderPath(folderId: string): Promise<DBFolder[]> {
  const path: DBFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const db = await initDB();
    const folder = await new Promise<DBFolder | undefined>((resolve, reject) => {
      const transaction = db.transaction(["folders"], "readonly");
      const store = transaction.objectStore("folders");
      const request = store.get(currentId!);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("폴더를 가져올 수 없습니다."));
    });

    if (!folder) break;

    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

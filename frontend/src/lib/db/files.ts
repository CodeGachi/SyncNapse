/**
 * 파일 관리 함수
 */

import { initDB } from "./index";
import type { DBFile } from "./index";
import { v4 as uuidv4 } from "uuid";

export type { DBFile };

/**
 * 파일 저장
 */
export async function saveFile(
  noteId: string,
  file: File
): Promise<DBFile> {
  const db = await initDB();
  const dbFile: DBFile = {
    id: uuidv4(),
    noteId,
    fileName: file.name,
    fileData: file,
    fileType: file.type,
    size: file.size,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.add(dbFile);

    request.onsuccess = () => {
      resolve(dbFile);
    };

    request.onerror = () => {
      reject(new Error("파일 저장 실패"));
    };
  });
}

/**
 * 노트의 모든 파일 가져오기
 */
export async function getFilesByNote(noteId: string): Promise<DBFile[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const index = store.index("noteId");
    const request = index.getAll(noteId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("파일 목록을 가져올 수 없습니다."));
    };
  });
}

/**
 * 파일 가져오기
 */
export async function getFile(fileId: string): Promise<DBFile | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.get(fileId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("파일을 가져올 수 없습니다."));
    };
  });
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.delete(fileId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("파일 삭제 실패"));
  });
}

/**
 * 노트의 모든 파일 삭제
 */
export async function deleteFilesByNote(noteId: string): Promise<void> {
  const files = await getFilesByNote(noteId);
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");

    let completed = 0;
    const total = files.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const file of files) {
      const request = store.delete(file.id);

      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error("파일 삭제 실패"));
      };
    }
  });
}

/**
 * 여러 파일 한번에 저장
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  const savedFiles: DBFile[] = [];

  for (const file of files) {
    const dbFile = await saveFile(noteId, file);
    savedFiles.push(dbFile);
  }

  return savedFiles;
}

/**
 * DBFile을 File 객체로 변환
 */
export function dbFileToFile(dbFile: DBFile): File {
  return new File([dbFile.fileData], dbFile.fileName, {
    type: dbFile.fileType,
  });
}
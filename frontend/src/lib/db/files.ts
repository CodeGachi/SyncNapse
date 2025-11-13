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
  file: File,
  backendUrl?: string
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
    backendUrl, // 백엔드 URL 저장
  };

  console.log('[IndexedDB] 파일 저장 시도:', {
    id: dbFile.id,
    noteId: dbFile.noteId,
    fileName: dbFile.fileName,
    fileSize: dbFile.size,
    fileType: dbFile.fileType,
  });

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.add(dbFile);

    request.onsuccess = () => {
      console.log('[IndexedDB] 파일 저장 성공:', dbFile.id, dbFile.fileName);
      resolve(dbFile);
    };

    request.onerror = () => {
      console.error('[IndexedDB] 파일 저장 실패:', request.error);
      reject(new Error(`파일 저장 실패: ${request.error?.message || 'Unknown error'}`));
    };

    transaction.oncomplete = () => {
      console.log('[IndexedDB] Transaction 완료:', dbFile.fileName);
    };

    transaction.onerror = () => {
      console.error('[IndexedDB] Transaction 에러:', transaction.error);
    };
  });
}

/**
 * 노트의 모든 파일 가져오기
 */
export async function getFilesByNote(noteId: string): Promise<DBFile[]> {
  const db = await initDB();
  console.log('[IndexedDB] 파일 로드 시도:', noteId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const index = store.index("noteId");
    const request = index.getAll(noteId);

    request.onsuccess = () => {
      const files = request.result;
      console.log('[IndexedDB] 파일 로드 성공:', {
        noteId,
        fileCount: files.length,
        files: files.map(f => ({ id: f.id, name: f.fileName, size: f.size }))
      });
      resolve(files);
    };

    request.onerror = () => {
      console.error('[IndexedDB] 파일 로드 실패:', request.error);
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
  files: File[],
  backendUrlMap?: Map<string, string>
): Promise<DBFile[]> {
  const savedFiles: DBFile[] = [];

  for (const file of files) {
    const backendUrl = backendUrlMap?.get(file.name);
    const dbFile = await saveFile(noteId, file, backendUrl);
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

/**
 * 디버깅용: 모든 파일 목록 가져오기
 */
export async function debugGetAllFiles(): Promise<DBFile[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.getAll();

    request.onsuccess = () => {
      const files = request.result;
      console.log('[DEBUG] 전체 파일 목록:', files);
      console.table(files.map(f => ({
        id: f.id,
        noteId: f.noteId,
        fileName: f.fileName,
        size: f.size,
        type: f.fileType,
        createdAt: new Date(f.createdAt).toLocaleString(),
      })));
      resolve(files);
    };

    request.onerror = () => {
      console.error('[DEBUG] 파일 목록 조회 실패:', request.error);
      reject(request.error);
    };
  });
}

/**
 * 디버깅용: IndexedDB 전체 삭제
 */
export async function debugClearAllFiles(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[DEBUG] 모든 파일 삭제 완료');
      resolve();
    };

    request.onerror = () => {
      console.error('[DEBUG] 파일 삭제 실패:', request.error);
      reject(request.error);
    };
  });
}

// 브라우저 콘솔에서 사용할 수 있도록 전역에 노출
if (typeof window !== 'undefined') {
  (window as any).__debugFiles = {
    getAll: debugGetAllFiles,
    clearAll: debugClearAllFiles,
  };
  console.log('[DEBUG] 파일 디버깅 도구 사용법:');
  console.log('  - 모든 파일 보기: __debugFiles.getAll()');
  console.log('  - 모든 파일 삭제: __debugFiles.clearAll()');
}
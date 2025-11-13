/**
 * 필기 데이터 관리 함수
 * Fabric.js 그리기 데이터를 IndexedDB에 저장/로드
 */

import { initDB } from "./index";
import type { DrawingData } from "@/lib/types/drawing";

// 필기 데이터 저장소 이름
const DRAWINGS_STORE = "drawings";

/**
 * 모든 필기 데이터 가져오기
 */
export async function getAllDrawings(): Promise<DrawingData[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAWINGS_STORE], "readonly");
    const store = transaction.objectStore(DRAWINGS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error("필기 데이터를 가져올 수 없습니다."));
    };
  });
}

/**
 * 특정 노트의 필기 데이터 가져오기
 * @param noteId - 노트 ID
 * @param fileId - 파일 ID
 * @param pageNum - 페이지 번호
 */
export async function getDrawing(
  noteId: string,
  fileId: string,
  pageNum: number
): Promise<DrawingData | undefined> {
  const db = await initDB();
  const key = `${noteId}-${fileId}-${pageNum}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAWINGS_STORE], "readonly");
    const store = transaction.objectStore(DRAWINGS_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("필기 데이터를 가져올 수 없습니다."));
    };
  });
}

/**
 * 특정 노트의 모든 필기 데이터 가져오기
 * @param noteId - 노트 ID
 */
export async function getDrawingsByNote(noteId: string): Promise<DrawingData[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAWINGS_STORE], "readonly");
    const store = transaction.objectStore(DRAWINGS_STORE);
    const index = store.index("noteId");
    const request = index.getAll(noteId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error("필기 데이터를 가져올 수 없습니다."));
    };
  });
}

/**
 * 필기 데이터 저장
 * @param data - 저장할 필기 데이터 (fileId 포함)
 */
export async function saveDrawing(data: DrawingData): Promise<void> {
  const db = await initDB();
  const key = `${data.noteId}-${data.fileId}-${data.pageNum}`;

  const drawingData: DrawingData = {
    ...data,
    id: key, // ID를 noteId-fileId-pageNum 형식으로 설정
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAWINGS_STORE], "readwrite");
    const store = transaction.objectStore(DRAWINGS_STORE);
    const request = store.put(drawingData);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(
        new Error(
          `필기 데이터 저장 실패: ${request.error?.message || "Unknown error"}`
        )
      );
    };
  });
}

/**
 * 필기 데이터 삭제
 * @param noteId - 노트 ID
 * @param fileId - 파일 ID
 * @param pageNum - 페이지 번호
 */
export async function deleteDrawing(
  noteId: string,
  fileId: string,
  pageNum: number
): Promise<void> {
  const db = await initDB();
  const key = `${noteId}-${fileId}-${pageNum}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAWINGS_STORE], "readwrite");
    const store = transaction.objectStore(DRAWINGS_STORE);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("필기 데이터 삭제 실패"));
    };
  });
}

/**
 * 특정 노트의 모든 필기 데이터 삭제
 * @param noteId - 노트 ID
 */
export async function deleteDrawingsByNote(noteId: string): Promise<void> {
  const drawings = await getDrawingsByNote(noteId);
  await Promise.all(
    drawings.map((drawing) => deleteDrawing(noteId, drawing.fileId, drawing.pageNum))
  );
}

/**
 * 모든 필기 데이터 초기화 (개발용)
 */
export async function clearDrawings(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DRAWINGS_STORE], "readwrite");
    const store = transaction.objectStore(DRAWINGS_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("필기 데이터 초기화 실패"));
    };
  });
}

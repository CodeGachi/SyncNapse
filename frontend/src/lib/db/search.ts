/**
 * IndexedDB 검색 관련 CRUD 함수
 * 백엔드에서 동기화된 검색용 메타데이터 관리
 */

import {
  initDB,
  type DBSearchNote,
  type DBSearchFile,
  type DBSearchSegment,
  type DBSyncMeta,
} from "./index";

// ============================================
// 검색 결과 타입
// ============================================

export interface SearchResults {
  notes: DBSearchNote[];
  files: DBSearchFile[];
  segments: DBSearchSegment[];
}

// ============================================
// 노트 검색 CRUD
// ============================================

/**
 * 검색용 노트 저장 (단일)
 */
export async function saveSearchNote(note: DBSearchNote): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchNotes"], "readwrite");
    const store = transaction.objectStore("searchNotes");
    const request = store.put(note);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("검색용 노트 저장 실패"));
  });
}

/**
 * 검색용 노트 일괄 저장
 */
export async function saveSearchNotes(notes: DBSearchNote[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchNotes"], "readwrite");
    const store = transaction.objectStore("searchNotes");

    let completed = 0;
    const total = notes.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const note of notes) {
      const request = store.put(note);
      request.onsuccess = () => {
        completed++;
        if (completed === total) resolve();
      };
      request.onerror = () => reject(new Error("검색용 노트 일괄 저장 실패"));
    }
  });
}

/**
 * 모든 검색용 노트 조회
 */
export async function getAllSearchNotes(): Promise<DBSearchNote[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchNotes"], "readonly");
    const store = transaction.objectStore("searchNotes");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("검색용 노트 조회 실패"));
  });
}

/**
 * 검색용 노트 전체 삭제
 */
export async function clearSearchNotes(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchNotes"], "readwrite");
    const store = transaction.objectStore("searchNotes");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("검색용 노트 삭제 실패"));
  });
}

// ============================================
// 파일 검색 CRUD
// ============================================

/**
 * 검색용 파일 일괄 저장
 */
export async function saveSearchFiles(files: DBSearchFile[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchFiles"], "readwrite");
    const store = transaction.objectStore("searchFiles");

    let completed = 0;
    const total = files.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const file of files) {
      const request = store.put(file);
      request.onsuccess = () => {
        completed++;
        if (completed === total) resolve();
      };
      request.onerror = () => reject(new Error("검색용 파일 일괄 저장 실패"));
    }
  });
}

/**
 * 모든 검색용 파일 조회
 */
export async function getAllSearchFiles(): Promise<DBSearchFile[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchFiles"], "readonly");
    const store = transaction.objectStore("searchFiles");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("검색용 파일 조회 실패"));
  });
}

/**
 * 검색용 파일 전체 삭제
 */
export async function clearSearchFiles(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchFiles"], "readwrite");
    const store = transaction.objectStore("searchFiles");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("검색용 파일 삭제 실패"));
  });
}

// ============================================
// 세그먼트 검색 CRUD
// ============================================

/**
 * 검색용 세그먼트 일괄 저장
 */
export async function saveSearchSegments(segments: DBSearchSegment[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchSegments"], "readwrite");
    const store = transaction.objectStore("searchSegments");

    let completed = 0;
    const total = segments.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const segment of segments) {
      const request = store.put(segment);
      request.onsuccess = () => {
        completed++;
        if (completed === total) resolve();
      };
      request.onerror = () => reject(new Error("검색용 세그먼트 일괄 저장 실패"));
    }
  });
}

/**
 * 모든 검색용 세그먼트 조회
 */
export async function getAllSearchSegments(): Promise<DBSearchSegment[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchSegments"], "readonly");
    const store = transaction.objectStore("searchSegments");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("검색용 세그먼트 조회 실패"));
  });
}

/**
 * 검색용 세그먼트 전체 삭제
 */
export async function clearSearchSegments(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["searchSegments"], "readwrite");
    const store = transaction.objectStore("searchSegments");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("검색용 세그먼트 삭제 실패"));
  });
}

// ============================================
// 동기화 메타데이터
// ============================================

/**
 * 동기화 메타데이터 저장
 */
export async function saveSyncMeta(meta: DBSyncMeta): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["syncMeta"], "readwrite");
    const store = transaction.objectStore("syncMeta");
    const request = store.put(meta);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("동기화 메타데이터 저장 실패"));
  });
}

/**
 * 동기화 메타데이터 조회
 */
export async function getSyncMeta(id: string): Promise<DBSyncMeta | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["syncMeta"], "readonly");
    const store = transaction.objectStore("syncMeta");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("동기화 메타데이터 조회 실패"));
  });
}

// ============================================
// 검색 함수
// ============================================

/**
 * IndexedDB에서 로컬 검색 수행
 * @param query 검색어
 * @returns 검색 결과 (최신순 정렬)
 */
export async function searchLocal(query: string): Promise<SearchResults> {
  const q = query.toLowerCase().trim();

  if (!q) {
    return { notes: [], files: [], segments: [] };
  }

  // 모든 데이터 조회
  const [allNotes, allFiles, allSegments] = await Promise.all([
    getAllSearchNotes(),
    getAllSearchFiles(),
    getAllSearchSegments(),
  ]);

  // 필터링 + 최신순 정렬
  const notes = allNotes
    .filter((n) => n.title.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const files = allFiles
    .filter((f) => f.fileName.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const segments = allSegments
    .filter((s) => s.text.toLowerCase().includes(q))
    .sort((a, b) => b.startTime - a.startTime);

  return { notes, files, segments };
}

// ============================================
// 전체 검색 데이터 삭제
// ============================================

/**
 * 모든 검색 데이터 삭제
 */
export async function clearAllSearchData(): Promise<void> {
  await Promise.all([
    clearSearchNotes(),
    clearSearchFiles(),
    clearSearchSegments(),
  ]);
}

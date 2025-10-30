/**
 * IndexedDB 기반 로컬 스토리지 시스템
 * 백엔드 연결 전까지 개발용으로 사용
 */

const DB_NAME = "SyncNapseDB";
const DB_VERSION = 2;

// DB 스키마
export interface DBFolder {
  id: string;
  name: string;
  parentId: string | null; // null이면 루트 폴더
  createdAt: number;
  updatedAt: number;
}

export interface DBNote {
  id: string;
  title: string;
  folderId: string; // 폴더 ID (root 가능)
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // 썸네일 이미지 (옵션)
}

export interface DBFile {
  id: string;
  noteId: string;
  fileName: string;
  fileData: Blob;
  fileType: string;
  size: number;
  createdAt: number;
}

export interface DBNoteContent {
  id: string; // noteId-pageId 형식
  noteId: string;
  pageId: string;
  blocks: any[]; // NoteBlock[]
  updatedAt: number;
}

export interface DBRecording {
  id: string;
  noteId: string;
  name: string;
  recordingData: Blob;
  duration: number;
  createdAt: number;
}

export interface DBTrashItem {
  id: string; // 원래 아이템의 ID
  type: "folder" | "note";
  data: DBFolder | DBNote; // 원래 데이터
  deletedAt: number;
  expiresAt: number; // 영구 삭제 예정 시간 (15일 후)
}

let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDB 초기화
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("IndexedDB를 열 수 없습니다."));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 폴더 스토어
      if (!db.objectStoreNames.contains("folders")) {
        const folderStore = db.createObjectStore("folders", { keyPath: "id" });
        folderStore.createIndex("parentId", "parentId", { unique: false });
      }

      // 노트 스토어
      if (!db.objectStoreNames.contains("notes")) {
        const noteStore = db.createObjectStore("notes", { keyPath: "id" });
        noteStore.createIndex("folderId", "folderId", { unique: false });
        noteStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 파일 스토어
      if (!db.objectStoreNames.contains("files")) {
        const fileStore = db.createObjectStore("files", { keyPath: "id" });
        fileStore.createIndex("noteId", "noteId", { unique: false });
      }

      // 노트 컨텐츠 스토어
      if (!db.objectStoreNames.contains("noteContent")) {
        const contentStore = db.createObjectStore("noteContent", {
          keyPath: "id",
        });
        contentStore.createIndex("noteId", "noteId", { unique: false });
      }

      // 녹음본 스토어
      if (!db.objectStoreNames.contains("recordings")) {
        const recordingStore = db.createObjectStore("recordings", {
          keyPath: "id",
        });
        recordingStore.createIndex("noteId", "noteId", { unique: false });
      }

      // 휴지통 스토어
      if (!db.objectStoreNames.contains("trash")) {
        const trashStore = db.createObjectStore("trash", { keyPath: "id" });
        trashStore.createIndex("type", "type", { unique: false });
        trashStore.createIndex("deletedAt", "deletedAt", { unique: false });
        trashStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
  });
}

/**
 * DB 닫기
 */
export function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * DB 초기화 (개발용 - 모든 데이터 삭제)
 */
export async function resetDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    closeDB();
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("DB 삭제 실패"));
    };
  });
}

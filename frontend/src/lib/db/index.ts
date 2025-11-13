/**
 * IndexedDB 기반 로컬 스토리지 시스템
 * 백엔드 연결 전까지 개발용으로 사용
 */

const DB_NAME = "SyncNapseDB";
const DB_VERSION = 6; // v6: questions 스토어 추가

// DB 스키마
export interface DBFolder {
  id: string;
  name: string;
  parentId: string | null; // null이면 루트 폴더
  createdAt: number;
  updatedAt: number;
}

/**
 * 공유 및 접근 제어 설정 (Educator 노트 전용)
 */
export interface DBNoteAccessControl {
  isPublic: boolean; // true: 누구나 링크로 접근 가능, false: 초대된 사용자만
  allowedUsers?: string[]; // 초대된 사용자 ID 목록
  shareLink?: string; // 공유 링크 토큰 (랜덤 생성)
  expiresAt?: number; // 링크 만료 시간
  allowComments: boolean; // 학생들의 댓글/질문 허용 여부
  realTimeInteraction: boolean; // 실시간 상호작용(손들기, 투표 등) 활성화
}

/**
 * 노트 데이터 모델
 * Student 노트: 개인 필기용
 * Educator 노트: 강의 공유용 (추가 기능 포함)
 */
export interface DBNote {
  id: string;
  title: string;
  folderId: string; // 폴더 ID (root 가능)
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // 썸네일 이미지 (옵션)

  // 새로 추가: 노트 타입
  type: "student" | "educator"; // student: 개인 노트, educator: 강의 공유 노트

  // 새로 추가: 생성자 정보 (로그인 구현 시 사용)
  createdBy?: string; // 생성자 사용자 ID

  // 새로 추가: Educator 노트 전용 설정
  accessControl?: DBNoteAccessControl; // 공유 및 접근 제어 설정
}

export interface DBFile {
  id: string;
  noteId: string;
  fileName: string;
  fileData: Blob;
  fileType: string;
  size: number;
  createdAt: number;
  backendUrl?: string; // 백엔드 영구 URL (옵션)
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

/**
 * Q&A 질문 데이터 모델
 */
export interface DBQuestion {
  id: string; // 질문 ID
  noteId: string; // 노트 ID
  content: string; // 질문 내용
  authorId: string; // 작성자 ID
  authorName: string; // 작성자 이름
  createdAt: number; // 생성 시간
  updatedAt: number; // 수정 시간
  answers: Array<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: number;
    isBest: boolean;
  }>;
  upvotes: string[]; // 추천한 userId 목록
  isPinned: boolean; // Educator 고정
  isSharedToAll: boolean; // 전체 공유 여부
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

      // 필기 데이터 스토어
      if (!db.objectStoreNames.contains("drawings")) {
        const drawingStore = db.createObjectStore("drawings", { keyPath: "id" });
        drawingStore.createIndex("noteId", "noteId", { unique: false });
        drawingStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Q&A 질문 스토어
      if (!db.objectStoreNames.contains("questions")) {
        const questionStore = db.createObjectStore("questions", { keyPath: "id" });
        questionStore.createIndex("noteId", "noteId", { unique: false });
        questionStore.createIndex("createdAt", "createdAt", { unique: false });
        questionStore.createIndex("isPinned", "isPinned", { unique: false });
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
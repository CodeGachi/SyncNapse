/**
 * Domain Types
 * Core business logic main types
 */

// ============================================================================
// Folder (폴더)
// ============================================================================

/**
 * Folder main type
 * - Folder type used in UI
 * - Used for conversion from IndexedDB and Backend API
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  noteCount?: number; // UI field (calculated value)
}

// ============================================================================
// Note (노트)
// ============================================================================

/**
 * 공유 및 접근 제어 설정 (Educator 노트 전용)
 */
export interface NoteAccessControl {
  isPublic: boolean; // true: 누구나 링크로 접근 가능, false: 초대된 사용자만
  allowedUsers?: string[]; // 초대된 사용자 ID 목록
  shareLink?: string; // 공유 링크 토큰
  expiresAt?: number; // 링크 만료 시간
  allowComments: boolean; // 학생들의 댓글/질문 허용 여부
  realTimeInteraction: boolean; // 실시간 상호작용(손들기, 투표 등) 활성화
}

/**
 * Data type used when creating/editing notes
 */
export interface NoteData {
  title: string;
  location: string;
  files: File[];
  type: "student" | "educator"; // 노트 타입
}

/**
 * 공개 접근 레벨
 */
export type PublicAccess = "PRIVATE" | "PUBLIC_READ" | "PUBLIC_EDIT";

/**
 * Note main type
 * - Note type used in UI
 * - Used for conversion from IndexedDB and Backend API
 */
export interface Note {
  id: string;
  title: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;

  // 새로 추가: 노트 타입
  type: "student" | "educator"; // student: 개인 노트, educator: 강의 공유 노트

  // 새로 추가: 공개 설정 (백엔드와 동기화)
  publicAccess?: PublicAccess;

  // 새로 추가: 허용된 도메인 (도메인 기반 공유)
  allowedDomains?: string[];

  // 새로 추가: 생성자 정보
  createdBy?: string;

  // 새로 추가: Educator 노트 전용 설정
  accessControl?: NoteAccessControl;

  // 즐겨찾기
  is_favorite?: boolean;

  // Trash-related fields
  deletedAt?: string; // ISO string timestamp when note was deleted
  folderName?: string; // Folder name for trashed notes display
}

/**
 * Note attached file information
 */
export interface NoteFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

// ============================================================================
// Tag (태그)
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

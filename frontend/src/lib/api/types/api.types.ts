/**
 * Backend API Response Types
 * Defines backend API response types
 *
 * Note: These types may change depending on the backend API response structure.
 * When the backend structure changes, only this file needs to be updated.
 */

// ============================================================================
// Folder API Types
// ============================================================================

export interface ApiFolderResponse {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // color?: string;
  // icon?: string;
  // is_shared?: boolean;
  // owner_id?: string;
}

/**
 * 폴더 생성 요청 타입
 */
export interface ApiFolderCreateRequest {
  name: string;
  parent_id: string | null;
}

/**
 * 폴더 업데이트 요청 타입
 */
export interface ApiFolderUpdateRequest {
  name?: string;
  parent_id?: string | null;
}

// ============================================================================
// Note API Types
// ============================================================================

/**
 * 노트의 API 응답 타입
 */
export interface ApiNoteResponse {
  id: string;
  title: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
  type?: "student" | "educator"; // 노트 타입 (student: 개인 노트, educator: 강의 공유 노트)
  // 노트의 옵션 추가할 수 있는 필드들
  // tags?: string[];
  // is_favorite?: boolean;
  // last_viewed_at?: string;
}

/**
 * 노트 생성 요청 타입 (FormData를 사용할 때)
 */
export interface ApiNoteCreateRequest {
  title: string;
  folder_id: string;
  // files는 FormData에 직접 추가
}

/**
 * 노트 업데이트 요청 타입
 */
export interface ApiNoteUpdateRequest {
  title?: string;
  folder_id?: string;
  thumbnail?: string;
}

// ============================================================================
// File API Types
// ============================================================================

export interface ApiFileResponse {
  id: string;
  note_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  url?: string;  // 다운로드 URL
}

// ============================================================================
// Trash API Types
// ============================================================================

export interface ApiTrashItemResponse {
  id: string;
  type: "folder" | "note";
  data: ApiFolderResponse | ApiNoteResponse;
  deleted_at: string;
  expires_at: string;
}

// ============================================================================
// Common API Types
// ============================================================================

/**
 * API 에러 응답
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 페이지네이션 응답
 */
export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// Search API Types
// ============================================================================

/**
 * 검색 결과 - 노트
 */
export interface ApiSearchNoteResult {
  id: string;
  type: "note";
  title: string;
  updatedAt: string;
}

/**
 * 검색 결과 - 파일
 */
export interface ApiSearchFileResult {
  id: string;
  type: "file";
  title: string;
  noteTitle: string;
  noteId: string;
  updatedAt: string;
}

/**
 * 검색 결과 - 음성 전사 세그먼트
 */
export interface ApiSearchSegmentResult {
  id: string;
  type: "segment";
  text: string;
  startTime: number;
  endTime: number;
  sessionId: string;
  sessionTitle: string;
  noteId: string;
  noteTitle: string | null;
  confidence: number;
}

/**
 * 통합 검색 API 응답
 */
export interface ApiSearchResponse {
  notes: ApiSearchNoteResult[];
  files: ApiSearchFileResult[];
  segments: ApiSearchSegmentResult[];
}

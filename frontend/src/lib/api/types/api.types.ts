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
 * 백엔드 API 노트 응답 타입
 */
export interface ApiNoteResponse {
  id: string;
  title: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
  // 백엔드에서 추가될 수 있는 필드들
  // tags?: string[];
  // is_favorite?: boolean;
  // last_viewed_at?: string;
}

/**
 * 노트 생성 요청 타입 (FormData로 전송 시)
 */
export interface ApiNoteCreateRequest {
  title: string;
  folder_id: string;
  // files는 FormData로 별도 전송
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

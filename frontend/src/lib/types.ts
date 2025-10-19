/**
 * 전역 타입 정의
 * 모든 타입 정의를 한 곳에서 관리합니다.
 */

// ============================================================================
// 파일 관련 타입
// ============================================================================

export interface UploadedFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ExtractedFile {
  name: string;
  data: Blob;
  size: number;
  path: string;
}

export interface FileConflict {
  newFile: File;
  existingFile: File;
  suggestedName?: string;
}

export type ConflictResolution =
  | "replace" // 기존 파일 덮어쓰기
  | "rename" // 새 이름으로 저장
  | "skip" // 건너뛰기
  | "cancel"; // 취소

export interface StorageUsage {
  totalBytes: number;
  totalMB: number;
  totalGB: number;
  usagePercentage: number;
}

// ============================================================================
// 업로드 큐 관련 타입
// ============================================================================

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
  uploadedBytes?: number;
  totalBytes?: number;
  startTime?: number;
  endTime?: number;
}

export interface UploadQueueOptions {
  maxConcurrent?: number;
  onFileComplete?: (file: UploadFile) => void;
  onFileError?: (file: UploadFile, error: Error) => void;
  onQueueComplete?: () => void;
  uploadFunction?: (
    file: File,
    onProgress: (progress: number) => void
  ) => Promise<void>;
}

export interface UploadQueueStats {
  total: number;
  pending: number;
  uploading: number;
  completed: number;
  error: number;
  cancelled: number;
  totalProgress: number;
}

// ============================================================================
// ZIP 파일 관련 타입
// ============================================================================

export interface ZipProcessOptions {
  /** 자동으로 압축 해제할지 여부 */
  autoExtract: boolean;
  /** 추출할 파일 확장자 필터 */
  allowedExtensions?: string[];
  /** 최대 파일 크기 (바이트) */
  maxFileSize?: number;
}

// ============================================================================
// 노트 관련 타입
// ============================================================================

export interface NoteData {
  title: string;
  location: string;
  files: File[];
}

export interface Folder {
  id: string;
  name: string;
  noteCount?: number;
}

export interface Note {
  id: string;
  title: string;
  location: string;
  files: NoteFile[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string; // 백엔드 URL (추후 구현)
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

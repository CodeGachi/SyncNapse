/**
 * Global type definitions
 * Manages all type declarations in a single place.
 */

// ============================================================================
// File-related types
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
  | "replace" 
  | "rename" 
  | "skip" 
  | "cancel"; 

export interface StorageUsage {
  totalBytes: number;
  totalMB: number;
  totalGB: number;
  usagePercentage: number;
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
  url?: string; 
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// ============================================================================
// Notification-related types
// ============================================================================

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationOptions {
  type?: NotificationType;
  duration?: number; // 자동 사라지는 시간 (ms), 0이면 수동으로만 닫음
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// 질문(Q&A) 관련 타입
// ============================================================================

export interface Question {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  status: "pending" | "answered";
  answer?: string;
  answeredAt?: string;
}

// ============================================================================
// 자동저장 관련 타입
// ============================================================================

export type AutoSaveStatus = "saved" | "saving" | "error" | "idle";

export interface AutoSaveState {
  status: AutoSaveStatus;
  lastSavedAt?: string;
  error?: string;
}

// ============================================================================
// 녹음 스크립트 및 번역 관련 타입
// ============================================================================

export type SupportedLanguage =
  | "ko" // 한국어
  | "en" // 영어
  | "ja" // 일본어
  | "zh" // 중국어
  | "es" // 스페인어
  | "fr" // 프랑스어
  | "de" // 독일어
  | "ru" // 러시아어
  | "ar" // 아랍어
  | "pt" // 포르투갈어


export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export interface ScriptSegment {
  id: string;
  timestamp: number; // 초 단위
  originalText: string;
  translatedText?: string;
  speaker?: string;
}

export interface TranslationSettings {
  enabled: boolean;
  targetLanguage: SupportedLanguage;
  autoTranslate: boolean;
}

export interface ScriptData {
  segments: ScriptSegment[];
  originalLanguage: SupportedLanguage;
  translation?: TranslationSettings;
}

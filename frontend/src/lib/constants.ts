/**
 * 전역 상수 정의
 * 모든 상수를 한 곳에서 관리합니다.
 */

// ============================================================================
// 파일 관련 상수
// ============================================================================

export const FILE_CONSTRAINTS = {
  // 파일 타입 제한 (MIME type)
  ALLOWED_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "application/zip",
    "application/x-zip-compressed",
  ] as const,

  // 파일 확장자 제한
  ALLOWED_EXTENSIONS: [
    ".pdf",
    ".doc",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".mp4",
    ".mov",
    ".zip",
  ] as const,

  // 최대 파일 크기 (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,

  // 최대 파일 개수
  MAX_FILES: 10,

  // 최대 전체 용량 (1GB)
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024,
} as const;

export const FILE_SIZE_UNITS = {
  BYTE: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

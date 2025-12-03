/**
 * Global constant definitions
 * Manages all constants in a single place.
 */

// ============================================================================
// File-related constants
// ============================================================================

export const FILE_CONSTRAINTS = {
  // File type restrictions (MIME type)
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

// File extension restrictions
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

  MAX_FILE_SIZE: 100 * 1024 * 1024,

  MAX_FILES: 10,

  MAX_TOTAL_SIZE: 1024 * 1024 * 1024,
} as const;

export const FILE_SIZE_UNITS = {
  BYTE: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

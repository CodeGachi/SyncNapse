/**
 * File-related Types
 * File upload, validation, and conflict processing related types
 */

// ============================================================================
// File Item (Note Editor)
// ============================================================================

/**
 * File item in note editor
 * Used for file management in the note editor (upload, display, etc.)
 */
export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string; // Blob URL for display
  file?: File; // Original file object
  backendId?: string; // Backend File ID (for timeline events)
}

// ============================================================================
// File Upload
// ============================================================================

/**
 * Uploaded file status
 */
export interface UploadedFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * ZIP extracted file
 */
export interface ExtractedFile {
  name: string;
  data: Blob;
  size: number;
  path: string;
}

// ============================================================================
// File Conflict
// ============================================================================

/**
 * File conflict information
 */
export interface FileConflict {
  newFile: File;
  existingFile: File;
  suggestedName?: string;
}

/**
 * File conflict resolution method
 */
export type ConflictResolution = "replace" | "rename" | "skip" | "cancel";

// ============================================================================
// Storage
// ============================================================================

/**
 * Storage usage information
 */
export interface StorageUsage {
  totalBytes: number;
  totalMB: number;
  totalGB: number;
  usagePercentage: number;
}

// ============================================================================
// ZIP Processing
// ============================================================================

/**
 * ZIP file processing options
 */
export interface ZipProcessOptions {
  /** Auto-extract compressed files */
  autoExtract: boolean;
  /** Allowed file extensions filter */
  allowedExtensions?: string[];
  /** Max file size (bytes) */
  maxFileSize?: number;
}

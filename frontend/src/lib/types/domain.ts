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
 * Data type used when creating/editing notes
 */
export interface NoteData {
  title: string;
  location: string;
  files: File[];
}

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

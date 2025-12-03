/**
 * API Module Barrel Export
 * @example
 * import { apiClient, API_BASE_URL, fetchAllNotes } from "@/lib/api";
 */

// ============================================================================
// Core Client
// ============================================================================
export {
  apiClient,
  API_BASE_URL,
  getAuthHeaders,
  clearCache,
  clearCacheByPattern,
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
  setupAuthInterceptor,
  type ApiError,
  type RequestConfig,
} from "./client";

// ============================================================================
// Auth Service (통합됨)
// ============================================================================
export {
  // OAuth Functions
  getGoogleLoginUrl,
  exchangeCodeForToken,
  verifyToken,
  refreshAccessToken,
  // Account Management
  restoreAccount,
  permanentDeleteAccount,
  deleteAccount,
  // Auth Status
  checkAuthStatus,
  getCurrentUserFromAPI,
  updateUserProfile,
  getCurrentUser,
  logout,
  // Types
  type User,
  type LoginResponse,
  type OAuthTokenResponse,
  type DeleteAccountResponse,
  type UpdateUserDto,
} from "./services/auth.api";

// Folders Service
export {
  fetchAllFolders,
  fetchFoldersByParent,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
  fetchFolderPath,
} from "./services/folders.api";

// Notes Service
export {
  fetchAllNotes,
  fetchNotesByFolder,
  fetchNote,
  createNote,
  updateNote,
  deleteNote,
  saveNoteContent,
  fetchNoteContent,
  fetchTrashedNotes,
  restoreNote,
  permanentlyDeleteNote,
} from "./services/notes.api";

// Files Service
export {
  fetchFilesByNote,
  fetchFilesWithIdByNote,
  saveFile,
  deleteFile,
  saveMultipleFiles,
  decodeFilename,
  type UploadResult,
  type FileWithId,
} from "./services/files.api";

// Recordings Service
export {
  fetchRecordingsByNote,
  saveRecording,
  deleteRecording,
  renameRecording,
  fetchRecording,
} from "./services/recordings.api";

// Trash Service
export * from "./services/trash.api";

// Search Service
export * from "./services/search.api";

// AI Service
export * from "./services/ai.api";

// Translation Service
export * from "./services/translation.api";

// Questions Service
export * from "./services/questions.api";

// Note Content Service
export * from "./services/note-content.api";

// Page Content Service
export * from "./services/page-content.api";

// ============================================================================
// Types
// ============================================================================
export * from "./types/api.types";

/**
 * Files API - Backend and IndexedDB abstraction with fallback
 * IndexedDB is tried first, and if it fails, falls back to API
 */
import type { DBFile } from "@/lib/db/files";
import {
  saveFile as saveFileInDB,
  getFilesByNote as getFilesByNoteFromDB,
  getFile as getFileFromDB,
  deleteFile as deleteFileInDB,
  dbFileToFile,
} from "@/lib/db/files";
import { getAuthHeaders } from "@/lib/api/client";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

/**
 * Fetch all files for a note
 * Tries IndexedDB first, falls back to API if unavailable or fails
 */
export async function fetchFilesByNote(noteId: string): Promise<File[]> {
  // Try IndexedDB first if available
  if (isIndexedDBAvailable()) {
    try {
      const dbFiles = await getFilesByNoteFromDB(noteId);
      if (dbFiles.length > 0) {
        console.log(`[files.api] Loaded ${dbFiles.length} files from IndexedDB`);
        return dbFiles.map(dbFileToFile);
      }
      // If IndexedDB is empty, fall through to API
      console.log(`[files.api] No files in IndexedDB, trying API...`);
    } catch (error) {
      console.warn("[files.api] IndexedDB failed, falling back to API:", error);
    }
  }

  // Fallback to API
  try {
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error("Failed to fetch files from API");
    const filesData = await res.json();

    console.log(`[files.api] Loaded ${filesData.length} files from API`);

    // Convert file URL from backend to File object
    const files = await Promise.all(
      filesData.map(async (fileData: any) => {
        const response = await fetch(fileData.url);
        const blob = await response.blob();
        return new File([blob], fileData.fileName, { type: fileData.fileType });
      })
    );

    return files;
  } catch (error) {
    console.error("[files.api] Failed to fetch files:", error);
    return [];
  }
}

/**
 * Save a file
 * Saves to IndexedDB immediately, then syncs to backend in parallel
 */
export async function saveFile(noteId: string, file: File): Promise<DBFile> {
  let localResult: DBFile | null = null;

  // 1. Save to IndexedDB immediately (fast local storage)
  if (isIndexedDBAvailable()) {
    try {
      localResult = await saveFileInDB(noteId, file);
      console.log(`[files.api] File saved to IndexedDB:`, file.name);
    } catch (error) {
      console.error("[files.api] Failed to save to IndexedDB:", error);
    }
  }

  // 2. Sync to backend in parallel (don't wait for it)
  const syncToBackend = async () => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save file to API");
      console.log(`[files.api] File synced to backend:`, file.name);
      return await res.json();
    } catch (error) {
      console.error("[files.api] Failed to sync to backend:", error);
      // Log but don't throw - file is already saved locally
      return null;
    }
  };

  // Start background sync (non-blocking)
  syncToBackend();

  // Return local result immediately
  if (localResult) {
    return localResult;
  }

  // If IndexedDB failed, try API as last resort
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to save file");
  return await res.json();
}

/**
 * Delete a file
 * Deletes from API and IndexedDB
 */
export async function deleteFile(fileId: string): Promise<void> {
  // Try API first
  try {
    const res = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) throw new Error("Failed to delete file from API");
    console.log(`[files.api] File deleted from API:`, fileId);
  } catch (error) {
    console.error("[files.api] Failed to delete from API:", error);
  }

  // Also delete from IndexedDB if available
  if (isIndexedDBAvailable()) {
    try {
      await deleteFileInDB(fileId);
      console.log(`[files.api] File deleted from IndexedDB:`, fileId);
    } catch (error) {
      console.warn("[files.api] Failed to delete from IndexedDB:", error);
    }
  }
}

/**
 * Save multiple files
 * Saves to IndexedDB immediately, then syncs to backend in parallel
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  let localResults: DBFile[] = [];

  // 1. Save to IndexedDB immediately (fast local storage)
  if (isIndexedDBAvailable()) {
    try {
      const { saveMultipleFiles: saveMultipleFilesInDB } = await import(
        "@/lib/db/files"
      );
      localResults = await saveMultipleFilesInDB(noteId, files);
      console.log(`[files.api] ${files.length} files saved to IndexedDB`);
    } catch (error) {
      console.error("[files.api] Failed to save to IndexedDB:", error);
    }
  }

  // 2. Sync to backend in parallel (don't wait for it)
  const syncToBackend = async () => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files/batch`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save files to API");
      console.log(`[files.api] ${files.length} files synced to backend`);
      return await res.json();
    } catch (error) {
      console.error("[files.api] Failed to sync to backend:", error);
      // Log but don't throw - files are already saved locally
      return null;
    }
  };

  // Start background sync (non-blocking)
  syncToBackend();

  // Return local results immediately
  if (localResults.length > 0) {
    return localResults;
  }

  // If IndexedDB failed, try API as last resort
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files/batch`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to save files");
  return await res.json();
}

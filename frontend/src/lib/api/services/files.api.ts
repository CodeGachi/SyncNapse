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
 * Returns local IndexedDB files immediately, then syncs metadata with server in background
 */
export async function fetchFilesByNote(noteId: string): Promise<File[]> {
  // 1. 로컬 IndexedDB에서 파일 가져오기 (빠른 응답)
  let localFiles: File[] = [];
  
  if (isIndexedDBAvailable()) {
    try {
      const dbFiles = await getFilesByNoteFromDB(noteId);
      localFiles = dbFiles.map(dbFileToFile);
      console.log(`[files.api] Loaded ${localFiles.length} files from IndexedDB`);
    } catch (error) {
      console.warn("[files.api] IndexedDB failed:", error);
    }
  }

  // 2. 백그라운드에서 서버와 동기화 (메타데이터만)
  syncFileMetadataInBackground(noteId);

  return localFiles;
}

/**
 * Background file metadata synchronization
 * 서버에 있는 파일을 다운로드하여 IndexedDB에 저장
 */
async function syncFileMetadataInBackground(noteId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });
    
    if (!res.ok) {
      console.warn('[files.api] Failed to fetch file metadata from server:', res.status);
      return;
    }
    
    const filesData = await res.json();
    console.log(`[files.api] Synced ${filesData.length} file metadata from server`);
    
    if (filesData.length === 0) {
      return;
    }

    // 서버에 있는 파일을 로컬 IndexedDB와 비교
    const localFiles = await getFilesByNoteFromDB(noteId);
    const localFileNames = new Set(localFiles.map((f) => f.fileName));

    // 로컬에 없는 파일 다운로드 및 저장 (파일 이름으로 비교)
    let downloadedCount = 0;
    for (const fileData of filesData) {
      if (!localFileNames.has(fileData.fileName)) {
        console.log(`[files.api] Downloading missing file: ${fileData.fileName}`);
        try {
          // 백엔드 프록시를 통해 파일 다운로드
          const downloadRes = await fetch(
            `${API_BASE_URL}/api/notes/${noteId}/files/${fileData.id}/download`,
            {
              credentials: "include",
              headers: {
                ...getAuthHeaders(),
              },
            }
          );

          if (!downloadRes.ok) {
            console.warn(`[files.api] Failed to download file ${fileData.id}:`, downloadRes.status);
            continue;
          }

          // Receive base64-encoded data from server
          const base64Response = await downloadRes.json();
          
          // Convert base64 to blob
          const binaryString = atob(base64Response.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: base64Response.fileType });
          const file = new File([blob], base64Response.fileName, { type: base64Response.fileType });

          // IndexedDB에 저장
          await saveFileInDB(noteId, file);
          console.log(`[files.api] ✅ Saved file to IndexedDB: ${fileData.fileName}`);
          downloadedCount++;
        } catch (error) {
          console.error(`[files.api] Failed to download/save file ${fileData.id}:`, error);
        }
      }
    }

    // UI 업데이트를 위한 이벤트 발생 (한 번만)
    if (downloadedCount > 0 && typeof window !== 'undefined') {
      console.log(`[files.api] 🎉 Downloaded and saved ${downloadedCount} files`);
      window.dispatchEvent(new CustomEvent('files-synced', { detail: { noteId } }));
    }
  } catch (error) {
    console.error('[files.api] Background file metadata sync failed:', error);
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

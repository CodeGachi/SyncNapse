/**
 * Files API - Backend and IndexedDB abstraction
 *
 * @deprecated Use files.api.v2.ts instead (sync-based architecture)
 * This V1 file will be removed in a future version
 */
import type { DBFile } from "@/lib/db/files";
import {
  saveFile as saveFileInDB,
  getFilesByNote as getFilesByNoteFromDB,
  getFile as getFileFromDB,
  deleteFile as deleteFileInDB,
  dbFileToFile,
} from "@/lib/db/files";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * File with DB ID information (for loading from storage)
 */
export interface FileWithId {
  id: string;
  file: File;
  createdAt: number;
}

/**
 * Fetch all files for a note (returns File[])
 * DEPRECATED: Use fetchFilesWithIdByNote instead for proper ID tracking
 */
export async function fetchFilesByNote(noteId: string): Promise<File[]> {
  const filesWithId = await fetchFilesWithIdByNote(noteId);
  return filesWithId.map((fwId) => fwId.file);
}

/**
 * Fetch all files for a note with ID information
 * Important: Returns FileWithId[] to maintain DBFile ID for consistency
 */
export async function fetchFilesWithIdByNote(noteId: string): Promise<FileWithId[]> {
  if (USE_LOCAL) {
    const dbFiles = await getFilesByNoteFromDB(noteId);
    return dbFiles.map((dbFile) => ({
      id: dbFile.id,
      file: dbFileToFile(dbFile),
      createdAt: dbFile.createdAt,
    }));
  } else {
    // Backend API call
    const res = await fetch(`/api/notes/${noteId}/files`);
    if (!res.ok) throw new Error("Failed to fetch files");
    const filesData = await res.json();

    // Convert file URL from backend to File object
    const files = await Promise.all(
      filesData.map(async (fileData: any) => {
        const response = await fetch(fileData.url);
        const blob = await response.blob();
        const file = new File([blob], fileData.fileName, { type: fileData.fileType });
        return {
          id: fileData.id,
          file,
          createdAt: fileData.createdAt || Date.now(),
        };
      })
    );

    return files;
  }
}

/**
 * Save a file
 */
export async function saveFile(noteId: string, file: File): Promise<DBFile> {
  if (USE_LOCAL) {
    return await saveFileInDB(noteId, file);
  } else {
    // Backend API call
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/notes/${noteId}/files`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save file");
    return await res.json();
  }
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  if (USE_LOCAL) {
    await deleteFileInDB(fileId);
  } else {
    // Backend API call
    const res = await fetch(`/api/files/${fileId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete file");
  }
}

/**
 * Save multiple files
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  if (USE_LOCAL) {
    const { saveMultipleFiles: saveMultipleFilesInDB } = await import(
      "@/lib/db/files"
    );
    return await saveMultipleFilesInDB(noteId, files);
  } else {
    // Backend API call
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`/api/notes/${noteId}/files/batch`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save files");
    return await res.json();
  }
}

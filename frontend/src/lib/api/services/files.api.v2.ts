/**
 * Files API V2 - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * 새로운 구조:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 동기화 큐에 추가
 * 3. 백그라운드에서 백엔드와 동기화
 */

import type { DBFile } from "@/lib/db/files";
import {
  saveFile as saveFileInDB,
  getFilesByNote as getFilesByNoteFromDB,
  deleteFile as deleteFileInDB,
  dbFileToFile,
} from "@/lib/db/files";
import { useSyncStore } from "@/lib/sync/sync-store";

/**
 * Upload result from file upload operation
 */
export interface UploadResult {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

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
 * - IndexedDB에서 즉시 반환
 */
export async function fetchFilesWithIdByNote(noteId: string): Promise<FileWithId[]> {
  const dbFiles = await getFilesByNoteFromDB(noteId);
  return dbFiles.map((dbFile) => ({
    id: dbFile.id,
    file: dbFileToFile(dbFile),
    createdAt: dbFile.createdAt,
  }));
}

/**
 * Save a file
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function saveFile(noteId: string, file: File): Promise<DBFile> {
  // 1. IndexedDB에 즉시 저장
  const dbFile = await saveFileInDB(noteId, file);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "file",
    entityId: dbFile.id,
    operation: "create",
    data: {
      note_id: noteId,
      file_name: dbFile.fileName,
      file_type: dbFile.fileType,
      file_size: dbFile.size, // ✅ Fixed: DBFile uses 'size' not 'fileSize'
      created_at: new Date(dbFile.createdAt).toISOString(),
    },
  });

  // 3. 즉시 반환
  return dbFile;
}

/**
 * Delete a file
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 */
export async function deleteFile(fileId: string): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  await deleteFileInDB(fileId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "file",
    entityId: fileId,
    operation: "delete",
  });
}

/**
 * Save multiple files
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  // 1. IndexedDB에 즉시 저장
  const { saveMultipleFiles: saveMultipleFilesInDB } = await import(
    "@/lib/db/files"
  );
  const dbFiles = await saveMultipleFilesInDB(noteId, files);

  // 2. 각 파일을 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  dbFiles.forEach((dbFile) => {
    syncStore.addToSyncQueue({
      entityType: "file",
      entityId: dbFile.id,
      operation: "create",
      data: {
        note_id: noteId,
        file_name: dbFile.fileName,
        file_type: dbFile.fileType,
        file_size: dbFile.size, // ✅ Fixed: DBFile uses 'size' not 'fileSize'
        created_at: new Date(dbFile.createdAt).toISOString(),
      },
    });
  });

  // 3. 즉시 반환
  return dbFiles;
}

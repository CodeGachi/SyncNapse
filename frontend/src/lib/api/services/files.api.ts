/**
 * Files API V2 - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * 새로운 구조:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 동기화 큐에 추가
 * 3. 백그라운드에서 백엔드와 동기화
 *
 * 백엔드 파일 저장 지원:
 * - NEXT_PUBLIC_USE_BACKEND_FILES=true 시 백엔드로 파일 업로드
 * - 백엔드에서 영구 URL 받아서 Liveblocks 동기화에 사용
 */

import type { DBFile } from "@/lib/db/files";
import {
  saveFile as saveFileInDB,
  getFilesByNote as getFilesByNoteFromDB,
  deleteFile as deleteFileInDB,
  dbFileToFile,
} from "@/lib/db/files";
import { useSyncStore } from "@/lib/sync/sync-store";
import { uploadFileToServer } from "@/lib/api/file-upload.api";

// 백엔드 파일 저장 사용 여부
const USE_BACKEND_FILES = process.env.NEXT_PUBLIC_USE_BACKEND_FILES === "true";

/**
 * Upload result from file upload operation
 */
export interface UploadResult {
  id: string;
  name: string;
  url: string; // blob URL (로컬) 또는 영구 URL (백엔드)
  size: number;
  type: string;
  uploadedAt: string;
  isBackendUrl?: boolean; // 백엔드 URL 여부
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
 * - 백엔드 사용 시: 백엔드로 업로드하고 영구 URL 받기
 * - 로컬 사용 시: IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function saveFile(noteId: string, file: File): Promise<DBFile> {
  console.log('[FilesAPI V2] saveFile 호출:', {
    noteId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  let backendUrl: string | undefined;

  // 1. 백엔드 파일 저장 사용 시 백엔드로 업로드
  if (USE_BACKEND_FILES) {
    try {
      console.log(`[FilesAPI V2] 백엔드로 업로드 시도: ${file.name}`);
      const backendResponse = await uploadFileToServer(file, noteId);
      backendUrl = backendResponse.fileUrl;
      console.log(`[FilesAPI V2] 백엔드 업로드 완료: ${backendUrl}`);
    } catch (error) {
      console.error("[FilesAPI V2] 백엔드 업로드 실패, 로컬 저장으로 폴백:", error);
      // 백엔드 실패 시 로컬 저장으로 폴백
    }
  }

  // 2. IndexedDB에 저장 (항상 로컬 백업 유지, 백엔드 URL 포함)
  console.log('[FilesAPI V2] IndexedDB 저장 시작...');
  const dbFile = await saveFileInDB(noteId, file, backendUrl);
  console.log('[FilesAPI V2] IndexedDB 저장 완료:', dbFile.id);

  // 3. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "file",
    entityId: dbFile.id,
    operation: "create",
    data: {
      note_id: noteId,
      file_name: dbFile.fileName,
      file_type: dbFile.fileType,
      file_size: dbFile.size,
      created_at: new Date(dbFile.createdAt).toISOString(),
      backend_url: backendUrl, // 백엔드 URL 추가
    },
  });
  console.log('[FilesAPI V2] 동기화 큐에 추가 완료');

  // 4. 즉시 반환
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
 * - 백엔드 사용 시: 백엔드로 업로드하고 영구 URL 받기
 * - 로컬 사용 시: IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  // 백엔드 URL 매핑 (파일명 -> URL)
  const backendUrlMap = new Map<string, string>();

  // 1. 백엔드 파일 저장 사용 시 각 파일을 백엔드로 업로드
  if (USE_BACKEND_FILES) {
    console.log(`[다중 파일 저장] 백엔드로 ${files.length}개 파일 업로드 시도`);

    await Promise.all(
      files.map(async (file) => {
        try {
          const backendResponse = await uploadFileToServer(file, noteId);
          backendUrlMap.set(file.name, backendResponse.fileUrl);
          console.log(`[다중 파일 저장] ${file.name} 백엔드 업로드 완료`);
        } catch (error) {
          console.error(`[다중 파일 저장] ${file.name} 백엔드 업로드 실패:`, error);
          // 실패한 파일은 로컬만 저장
        }
      })
    );
  }

  // 2. IndexedDB에 저장 (항상 로컬 백업 유지, 백엔드 URL 포함)
  const { saveMultipleFiles: saveMultipleFilesInDB } = await import(
    "@/lib/db/files"
  );
  const dbFiles = await saveMultipleFilesInDB(noteId, files, backendUrlMap);

  // 3. 각 파일을 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  dbFiles.forEach((dbFile) => {
    const backendUrl = backendUrlMap.get(dbFile.fileName);

    syncStore.addToSyncQueue({
      entityType: "file",
      entityId: dbFile.id,
      operation: "create",
      data: {
        note_id: noteId,
        file_name: dbFile.fileName,
        file_type: dbFile.fileType,
        file_size: dbFile.size,
        created_at: new Date(dbFile.createdAt).toISOString(),
        backend_url: backendUrl, // 백엔드 URL 추가 (있으면)
      },
    });
  });

  // 4. 즉시 반환
  return dbFiles;
}

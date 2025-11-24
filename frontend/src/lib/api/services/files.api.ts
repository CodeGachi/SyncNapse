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
 * Decode filename from Latin-1 to UTF-8
 * Multer encodes non-ASCII filenames as Latin-1, so we need to decode them properly
 */
function decodeFilename(filename: string): string {
  try {
    // Convert each character to its byte value (Latin-1 to bytes)
    const bytes = new Uint8Array(filename.length);
    for (let i = 0; i < filename.length; i++) {
      bytes[i] = filename.charCodeAt(i);
    }
    // Decode bytes as UTF-8
    const decoder = new TextDecoder("utf-8");
    const decoded = decoder.decode(bytes);
    // Check if decoding was successful (no replacement characters)
    if (decoded && !decoded.includes("\ufffd")) {
      return decoded;
    }
    return filename;
  } catch {
    return filename;
  }
}

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
 * - 백그라운드에서 백엔드와 동기화
 */
export async function fetchFilesWithIdByNote(noteId: string): Promise<FileWithId[]> {
  console.log(`[FilesAPI] Fetching files for note: ${noteId}`);
  
  // 1. IndexedDB에서 로컬 파일 먼저 가져오기
  const dbFiles = await getFilesByNoteFromDB(noteId);
  console.log(`[FilesAPI] IndexedDB files count: ${dbFiles.length}`);
  
  // 2. 백그라운드에서 백엔드 동기화
  syncFilesInBackground(noteId);
  
  // 3. 로컬 파일 즉시 반환
  return dbFiles.map((dbFile) => ({
    id: dbFile.id,
    file: dbFileToFile(dbFile),
    createdAt: dbFile.createdAt,
  }));
}

/**
 * 백그라운드에서 백엔드 파일과 동기화
 */
async function syncFilesInBackground(noteId: string): Promise<void> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      console.log(`[FilesAPI] No auth token, skipping backend sync`);
      return;
    }
    
    console.log(`[FilesAPI] Syncing files with backend for note: ${noteId}`);
    
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/files`, {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      console.warn(`[FilesAPI] Failed to fetch files from backend: ${res.status}`);
      return;
    }
    
    const backendFiles = await res.json();
    console.log(`[FilesAPI] Backend files count: ${backendFiles.length}`, backendFiles);

    // 백엔드 파일을 IndexedDB와 동기화
    if (backendFiles.length > 0) {
      // 로컬에 없는 파일 찾기
      const localFiles = await getFilesByNoteFromDB(noteId);
      const localFileNames = new Set(localFiles.map(f => f.fileName));

      // Backend filenames need to be decoded for proper comparison
      const filesToDownload = backendFiles.filter((bf: any) => {
        const decodedName = decodeFilename(bf.fileName);
        return !localFileNames.has(decodedName) && !localFileNames.has(bf.fileName);
      });
      
      if (filesToDownload.length > 0) {
        console.log(`[FilesAPI] Downloading ${filesToDownload.length} files from backend...`);
        
        for (const backendFile of filesToDownload) {
          try {
            console.log(`[FilesAPI] Downloading file: ${backendFile.fileName}`);
            
            // 파일 다운로드 (Base64로 받음)
            const downloadRes = await fetch(
              `${API_BASE_URL}/api/notes/${noteId}/files/${backendFile.id}/download`,
              {
                credentials: "include",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            
            if (!downloadRes.ok) {
              console.error(`[FilesAPI] Failed to download file ${backendFile.fileName}: ${downloadRes.status}`);
              continue;
            }
            
            const downloadData = await downloadRes.json();

            // Decode filename from Latin-1 to UTF-8 (for Korean and other non-ASCII filenames)
            const decodedFileName = decodeFilename(downloadData.fileName);

            console.log(`[FilesAPI] Downloaded file data:`, {
              originalFileName: downloadData.fileName,
              decodedFileName: decodedFileName,
              fileType: downloadData.fileType,
              fileSize: downloadData.fileSize,
              hasBase64Data: !!downloadData.data, // 'data' 필드 확인
            });

            // Base64를 Blob으로 변환 (백엔드는 'data' 필드로 base64를 반환)
            const base64Data = downloadData.data;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: downloadData.fileType });

            // File 객체 생성 (decoded filename 사용)
            const file = new File([blob], decodedFileName, {
              type: downloadData.fileType,
            });
            
            // IndexedDB에 저장
            await saveFileInDB(noteId, file, backendFile.url);
            console.log(`[FilesAPI] ✅ File saved to IndexedDB: ${file.name}`);
          } catch (error) {
            console.error(`[FilesAPI] Failed to download/save file ${backendFile.fileName}:`, error);
          }
        }
        
        // React Query 캐시 무효화하여 UI 업데이트
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('files-synced', { detail: { noteId } }));
        }
      } else {
        console.log(`[FilesAPI] All files already in IndexedDB`);
      }
    }
  } catch (error) {
    console.error(`[FilesAPI] Failed to sync files with backend:`, error);
  }
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

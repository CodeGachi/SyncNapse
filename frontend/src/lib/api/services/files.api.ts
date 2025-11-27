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
  backendId?: string; // Backend File ID (for timeline events)
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
  
  // 3. 로컬 파일 즉시 반환 (backendId 포함)
  return dbFiles.map((dbFile) => ({
    id: dbFile.id,
    file: dbFileToFile(dbFile),
    createdAt: dbFile.createdAt,
    backendId: dbFile.backendId, // Backend File ID (for timeline events)
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
      // 로컬 파일 목록 가져오기
      const localFiles = await getFilesByNoteFromDB(noteId);
      const localFileNames = new Set(localFiles.map(f => f.fileName));

      // 1. 기존 로컬 파일에 backendId가 없으면 매칭하여 업데이트
      const { updateFileBackendId } = await import("@/lib/db/files");
      let backendIdUpdated = false;
      for (const localFile of localFiles) {
        if (!localFile.backendId) {
          // 백엔드 파일과 이름으로 매칭
          const matchingBackend = backendFiles.find((bf: any) => {
            const decodedName = decodeFilename(bf.fileName);
            return decodedName === localFile.fileName || bf.fileName === localFile.fileName;
          });
          if (matchingBackend) {
            await updateFileBackendId(localFile.id, matchingBackend.id);
            console.log(`[FilesAPI] ✅ Updated backendId for existing file: ${localFile.fileName} -> ${matchingBackend.id}`);
            backendIdUpdated = true;
          }
        }
      }

      // backendId가 업데이트되었으면 캐시 무효화
      if (backendIdUpdated && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('files-synced', { detail: { noteId } }));
      }

      // 2. 로컬에 없는 파일 찾기 (Backend filenames need to be decoded for proper comparison)
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
            
            // IndexedDB에 저장 (backendId 포함)
            await saveFileInDB(noteId, file, backendFile.url, backendFile.id);
            console.log(`[FilesAPI] ✅ File saved to IndexedDB: ${file.name}, backendId: ${backendFile.id}`);
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
 * - 온라인: 백엔드로 즉시 업로드 → 성공 시 IndexedDB 저장 (백엔드 URL 포함)
 * - 오프라인/실패: IndexedDB에 저장 → 동기화 큐에 추가 (나중에 동기화)
 */
export async function saveFile(noteId: string, file: File): Promise<DBFile> {
  console.log('[FilesAPI V2] saveFile 호출:', {
    noteId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  let backendUrl: string | undefined;
  let backendId: string | undefined;
  let backendUploadSuccess = false;

  // 1. 백엔드로 즉시 업로드 시도 (온라인 상태 확인)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      console.log(`[FilesAPI V2] 백엔드로 업로드 시도: ${file.name}`);
      const backendResponse = await uploadFileToServer(file, noteId);
      backendUrl = backendResponse.storageUrl || backendResponse.fileUrl;
      backendId = backendResponse.id; // 백엔드 파일 ID 저장
      backendUploadSuccess = true;
      console.log(`[FilesAPI V2] ✅ 백엔드 업로드 완료: url=${backendUrl}, id=${backendId}`);
    } catch (error) {
      console.warn("[FilesAPI V2] ⚠️ 백엔드 업로드 실패, IndexedDB에 저장 후 나중에 동기화:", error);
      backendUploadSuccess = false;
    }
  } else {
    console.log("[FilesAPI V2] 오프라인 상태, IndexedDB에 저장 후 나중에 동기화");
  }

  // 2. IndexedDB에 저장 (로컬 백업, 백엔드 URL 및 ID 있으면 포함)
  console.log('[FilesAPI V2] IndexedDB 저장 시작...');
  const dbFile = await saveFileInDB(noteId, file, backendUrl, backendId);
  console.log('[FilesAPI V2] IndexedDB 저장 완료:', dbFile.id, 'backendId:', backendId || 'none');

  // 3. 백엔드 업로드 실패 시에만 동기화 큐에 추가 (나중에 재시도)
  if (!backendUploadSuccess) {
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
        // 파일 바이너리는 IndexedDB에서 조회해야 함 (Sync Manager에서 처리)
      },
    });
    console.log('[FilesAPI V2] 동기화 큐에 추가 완료 (나중에 백엔드 동기화)');
  }

  // 4. 즉시 반환
  return dbFile;
}

/**
 * Delete a file
 * - 먼저 파일 정보 조회 (backendId 확인)
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가 (backendId 포함)
 */
export async function deleteFile(fileId: string): Promise<void> {
  // 1. 먼저 파일 정보 조회 (backendId 확인)
  const { getFile } = await import("@/lib/db/files");
  const file = await getFile(fileId);
  const backendId = file?.backendId;

  console.log(`[FilesAPI] Deleting file: ${fileId}, backendId: ${backendId || 'none'}`);

  // 2. IndexedDB에서 즉시 삭제
  await deleteFileInDB(fileId);

  // 3. 동기화 큐에 추가 (backendId 포함)
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "file",
    entityId: fileId,
    operation: "delete",
    data: {
      backend_id: backendId, // 백엔드 파일 ID (없으면 undefined)
    },
  });
}

/**
 * Save multiple files
 * - 온라인: 각 파일을 백엔드로 즉시 업로드 시도
 * - 성공한 파일: IndexedDB 저장 (백엔드 URL 포함)
 * - 실패한 파일: IndexedDB 저장 + 동기화 큐에 추가 (나중에 동기화)
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  // 백엔드 URL 매핑 (파일명 -> URL)
  const backendUrlMap = new Map<string, string>();
  // 백엔드 ID 매핑 (파일명 -> ID)
  const backendIdMap = new Map<string, string>();
  // 업로드 실패한 파일명 추적
  const failedUploads = new Set<string>();

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // 1. 온라인이면 각 파일을 백엔드로 업로드 시도
  if (isOnline) {
    console.log(`[다중 파일 저장] 백엔드로 ${files.length}개 파일 업로드 시도`);

    await Promise.all(
      files.map(async (file) => {
        try {
          const backendResponse = await uploadFileToServer(file, noteId);
          const url = backendResponse.storageUrl || backendResponse.fileUrl || '';
          if (url) {
            backendUrlMap.set(file.name, url);
          }
          if (backendResponse.id) {
            backendIdMap.set(file.name, backendResponse.id);
          }
          console.log(`[다중 파일 저장] ✅ ${file.name} 백엔드 업로드 완료, id=${backendResponse.id}`);
        } catch (error) {
          console.warn(`[다중 파일 저장] ⚠️ ${file.name} 백엔드 업로드 실패:`, error);
          failedUploads.add(file.name);
        }
      })
    );
  } else {
    console.log("[다중 파일 저장] 오프라인 상태, 모든 파일을 로컬에 저장 후 나중에 동기화");
    files.forEach((file) => failedUploads.add(file.name));
  }

  // 2. IndexedDB에 저장 (항상 로컬 백업 유지, 백엔드 URL 및 ID 포함)
  const { saveMultipleFiles: saveMultipleFilesInDB } = await import(
    "@/lib/db/files"
  );
  const dbFiles = await saveMultipleFilesInDB(noteId, files, backendUrlMap, backendIdMap);

  // 3. 백엔드 업로드 실패한 파일만 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  dbFiles.forEach((dbFile) => {
    if (failedUploads.has(dbFile.fileName)) {
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
          // 파일 바이너리는 IndexedDB에서 조회해야 함 (Sync Manager에서 처리)
        },
      });
      console.log(`[다중 파일 저장] ${dbFile.fileName} 동기화 큐에 추가 (나중에 백엔드 동기화)`);
    }
  });

  // 4. 즉시 반환
  return dbFiles;
}

/**
 * File Management Hook
 * Handles file addition and management in the right panel
 * noteId는 호출하는 컴포넌트에서 전달받아야 함
 */

"use client";

import { useNoteEditorStore } from "@/stores";
import { useSaveNoteFile } from "@/lib/api/mutations/files.mutations";
import { deleteFile as deleteFileAPI } from "@/lib/api/services/files.api";

interface UseFileManagementOptions {
  noteId?: string | null;
}

export function useFileManagement(options?: UseFileManagementOptions) {
  const { addFile, removeFile: removeFileFromStore } = useNoteEditorStore();
  const noteId = options?.noteId ?? null;

  // TanStack Query 뮤테이션 사용 (자동 캐시 무효화 포함)
  const saveFileMutation = useSaveNoteFile({
    onSuccess: (dbFile) => {
      console.log('[FileManagement] IndexedDB 저장 완료 (캐시 무효화됨):', dbFile.id);

      // DBFile의 fileData (Blob)를 File 객체로 변환
      const file = new File([dbFile.fileData], dbFile.fileName, {
        type: dbFile.fileType,
      });

      // Blob URL 생성 (재생/표시용)
      const url = URL.createObjectURL(file);

      // Store에 파일 추가
      const fileItem = {
        id: dbFile.id, // DBFile의 ID 사용 (고유성 보장)
        name: dbFile.fileName,
        type: dbFile.fileType,
        size: dbFile.size,
        uploadedAt: new Date(dbFile.createdAt).toISOString(),
        url,
        file,
      };
      addFile(fileItem);
      console.log('[FileManagement] Store에 파일 추가 완료:', fileItem.id);
    },
    onError: (error) => {
      console.error("[FileManagement] 파일 저장 실패:", error);
    },
  });

  // 파일 추가 (File -> FileItem 변환 + IndexedDB 저장)
  const handleAddFile = async (file: File) => {
    try {
      console.log('[FileManagement] 파일 추가 시작:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        noteId,
      });

      if (!noteId) {
        console.warn("[FileManagement] Note ID not available for file save");
        // Fallback: just add to store without persisting
        const url = URL.createObjectURL(file);
        const fileItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          url,
          file,
        };
        addFile(fileItem);
        console.log('[FileManagement] Store에만 파일 추가 (noteId 없음):', fileItem.id);
        return;
      }

      // IndexedDB에 파일 저장 (뮤테이션 사용 → 자동으로 쿼리 캐시 무효화)
      console.log('[FileManagement] IndexedDB 저장 시작 (뮤테이션 사용)...');
      await saveFileMutation.mutateAsync({ noteId, file });
    } catch (error) {
      console.error("[FileManagement] 파일 저장 실패:", error);
      throw error;
    }
  };

  // 파일 삭제 (IndexedDB + 백엔드 + Store 업데이트)
  const handleRemoveFile = async (fileId: string) => {
    try {
      console.log(`[FileManagement] 파일 삭제 시작: ${fileId}`);

      // 1. IndexedDB와 백엔드에서 삭제 (동기화 큐에 추가)
      await deleteFileAPI(fileId);
      console.log(`[FileManagement] IndexedDB/백엔드 삭제 완료: ${fileId}`);

      // 2. Store에서 제거 (UI 업데이트)
      removeFileFromStore(fileId);
      console.log(`[FileManagement] Store에서 제거 완료: ${fileId}`);
    } catch (error) {
      console.error(`[FileManagement] 파일 삭제 실패: ${fileId}`, error);
      // 삭제 실패 시에도 UI에서는 제거 (나중에 동기화 재시도)
      removeFileFromStore(fileId);
    }
  };

  return {
    handleAddFile,
    handleRemoveFile,
    isSaving: saveFileMutation.isPending,
  };
}

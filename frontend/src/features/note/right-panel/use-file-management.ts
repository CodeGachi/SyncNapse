/**
 * File Management Hook
 * Handles file addition and management in the right panel
 * noteId는 호출하는 컴포넌트에서 전달받아야 함
 */

"use client";

import { useNoteEditorStore } from "@/stores";
import { saveFile } from "@/lib/api/services/files.api.v2"; // ✅ V2 API로 변경

interface UseFileManagementOptions {
  noteId?: string | null;
}

export function useFileManagement(options?: UseFileManagementOptions) {
  const { addFile } = useNoteEditorStore();
  const noteId = options?.noteId ?? null;

  // 파일 추가 (File -> FileItem 변환 + IndexedDB 저장)
  const handleAddFile = async (file: File) => {
    try {
      if (!noteId) {
        console.warn("Note ID not available for file save");
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
        return;
      }

      // IndexedDB에 파일 저장
      const dbFile = await saveFile(noteId, file);

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
    } catch (error) {
      console.error("Failed to save file:", error);
      throw error;
    }
  };

  return {
    handleAddFile,
  };
}

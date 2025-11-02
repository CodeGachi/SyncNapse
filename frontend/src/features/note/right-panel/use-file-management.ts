/**
 * File Management Hook
 * Handles file addition and management in the right panel
 */

"use client";

import { useNoteEditorStore } from "@/stores";

export function useFileManagement() {
  const { addFile } = useNoteEditorStore();

  // 파일 추가 (File -> FileItem 변환)
  const handleAddFile = async (file: File) => {
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
  };

  return {
    handleAddFile,
  };
}

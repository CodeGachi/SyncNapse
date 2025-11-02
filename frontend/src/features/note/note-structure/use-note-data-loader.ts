/**
 * NoteDataLoader Hook
 * 파일 로드 및 자동저장 연동 로직 (TanStack Query 사용)
 */

import { useEffect } from "react";
import { useNoteEditorStore } from "@/stores";
import { useFilesByNote } from "@/lib/api/queries/files.queries";
import { saveNoteContent } from "@/lib/api/services/notes.api";

interface UseNoteDataLoaderProps {
  noteId: string | null;
}

export function useNoteDataLoader({ noteId }: UseNoteDataLoaderProps) {
  const {
    loadFiles: loadFilesToStore,
    getCurrentPageBlocks,
    selectedFileId,
    currentPage,
  } = useNoteEditorStore();

  // TanStack Query로 파일 목록 조회
  const { data: files = [] } = useFilesByNote(noteId);

  // 자동저장 콜백
  const handleAutoSave = async () => {
    if (!noteId) return;

    const blocks = getCurrentPageBlocks();

    if (selectedFileId && currentPage) {
      await saveNoteContent(noteId, `${selectedFileId}-${currentPage}`, blocks);
    }
  };

  // 파일 목록이 변경되면 스토어에 로드
  useEffect(() => {
    if (!noteId || files.length === 0) return;

    const fileItems = files.map((file) => ({
      id: file.name,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    }));

    loadFilesToStore(fileItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, noteId]);

  return {
    handleAutoSave,
  };
}

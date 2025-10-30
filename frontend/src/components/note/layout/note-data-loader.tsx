/**
 * 노트 데이터 로더 - Client Component
 * TanStack Query와 API 레이어를 사용하여 노트 데이터 로드
 */

"use client";

import { useEffect } from "react";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useNoteEditorStore } from "@/stores";
import { fetchFilesByNote } from "@/lib/api/client/files.api";
import { saveNoteContent } from "@/lib/api/client/notes.api";

interface NoteDataLoaderProps {
  noteId: string | null;
  children: React.ReactNode;
}

export function NoteDataLoader({ noteId, children }: NoteDataLoaderProps) {
  // TanStack Query로 노트 데이터 조회
  const { data: note, isLoading } = useNote(noteId);

  const {
    loadFiles: loadFilesToStore,
    getCurrentPageBlocks,
    selectedFileId,
    currentPage,
  } = useNoteEditorStore();

  // 자동저장 훅
  useAutoSave({
    noteId: noteId || "",
    enabled: !!noteId,
    onSave: async () => {
      if (!noteId) return;

      // 현재 페이지의 blocks를 저장 (API 레이어 사용)
      const blocks = getCurrentPageBlocks();

      if (selectedFileId && currentPage) {
        await saveNoteContent(noteId, `${selectedFileId}-${currentPage}`, blocks);
      }
    },
  });

  // 노트 파일 로드
  useEffect(() => {
    if (!noteId) return;

    const loadFiles = async () => {
      try {
        const files = await fetchFilesByNote(noteId);

        if (files && files.length > 0) {
          const fileItems = files.map((file) => ({
            id: file.name,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            url: URL.createObjectURL(file),
          }));
          loadFilesToStore(fileItems);
        }
      } catch (error) {
        // 파일 로드 실패 처리
      }
    };

    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    );
  }

  // 노트가 없는 경우
  if (!note && noteId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">노트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return <>{children}</>;
}

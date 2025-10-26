/**
 * 노트 데이터 로더 - Client Component
 * TanStack Query를 사용하여 노트 데이터를 불러오고 Zustand 스토어에 로드
 */

"use client";

import { useEffect } from "react";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useUpdateNote } from "@/lib/api/mutations/notes.mutations";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useNoteEditorStore } from "@/stores";

interface NoteDataLoaderProps {
  noteId: string | null;
  children: React.ReactNode;
}

export function NoteDataLoader({ noteId, children }: NoteDataLoaderProps) {
  // TanStack Query - 노트 데이터 조회
  const { data: note, isLoading, error } = useNote(noteId);

  // TanStack Query - 노트 업데이트
  const updateNote = useUpdateNote();

  const { loadFiles } = useNoteEditorStore();

  // 자동저장 훅
  useAutoSave({
    noteId: noteId || "",
    enabled: !!noteId,
    onSave: async () => {
      if (!noteId) return;
      await updateNote.mutateAsync({
        noteId,
        updates: {
          // blocks를 업데이트 (실제로는 백엔드 API에 맞게 수정 필요)
          // 임시로 updatedAt만 업데이트
          updatedAt: new Date().toISOString(),
        },
      });
    },
  });

  // TanStack Query로 받은 노트 데이터를 파일 패널에 로드
  useEffect(() => {
    if (note?.files && note.files.length > 0) {
      const fileItems = note.files.map((noteFile) => ({
        id: noteFile.id,
        name: noteFile.name,
        type: noteFile.type,
        size: noteFile.size,
        uploadedAt: note.createdAt,
        url: noteFile.url || "",
      }));
      loadFiles(fileItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500 text-xl">노트를 불러오는데 실패했습니다.</div>
      </div>
    );
  }

  // 노트가 없는 경우
  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">노트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return <>{children}</>;
}

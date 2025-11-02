/**
 * 노트 데이터 로더 - Client Component
 * TanStack Query와 API 레이어를 사용하여 노트 데이터 로드
 */

"use client";

import { useNote } from "@/lib/api/queries/notes.queries";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useNoteDataLoader } from "@/features/note/note-structure/use-note-data-loader";

interface NoteDataLoaderProps {
  noteId: string | null;
  children: React.ReactNode;
}

export function NoteDataLoader({ noteId, children }: NoteDataLoaderProps) {
  const { data: note, isLoading } = useNote(noteId);
  const { handleAutoSave } = useNoteDataLoader({ noteId });

  // 자동저장 훅
  useAutoSave({
    noteId: noteId || "",
    enabled: !!noteId,
    onSave: handleAutoSave,
  });

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

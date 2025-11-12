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
  isSharedView?: boolean; // 공유 모드 여부
  children: React.ReactNode;
}

export function NoteDataLoader({ noteId, children }: NoteDataLoaderProps) {
  const { data: note, isLoading, error } = useNote(noteId);
  const { handleAutoSave } = useNoteDataLoader({ noteId });

  // Debug logs
  console.log('[NoteDataLoader] Current state:', {
    noteId,
    hasNote: !!note,
    isLoading,
    error: error?.message,
    noteData: note
  });

  // 자동저장 훅
  useAutoSave({
    noteId: noteId || "",
    enabled: !!noteId && !isSharedView, // 공유 모드에서는 자동저장 비활성화
    onSave: handleAutoSave,
  });

  // 공유 모드일 때는 로컬 DB 체크 건너뛰기
  // (Liveblocks에서 노트 정보를 가져옴)
  if (isSharedView) {
    console.log("[NoteDataLoader] 공유 모드 - 로컬 DB 체크 건너뛰기");
    return <>{children}</>;
  }

  // 로딩 상태 처리 (로컬 모드만)
  if (isLoading) {
    console.log('[NoteDataLoader] Still loading note with ID:', noteId);
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    );
  }

  // 노트가 없는 경우 (로컬 모드만)
  if (!note && noteId) {
    console.error('[NoteDataLoader] Note not found for ID:', noteId);
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-xl">
          노트를 찾을 수 없습니다.
          <div className="text-sm text-gray-400 mt-2">
            Note ID: {noteId}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

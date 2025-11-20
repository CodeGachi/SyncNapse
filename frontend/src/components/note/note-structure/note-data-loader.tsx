/**
 * 노트 데이터 로더 - Client Component (리팩토링됨)
 * - IndexedDB를 단일 진실 공급원으로 사용
 * - blocks 상태는 Zustand 대신 BlockNote 에디터와 IndexedDB가 직접 관리
 * - 백그라운드 백엔드 동기화
 */

"use client";

import { useNote } from "@/lib/api/queries/notes.queries";
import { useNoteDataLoader } from "@/features/note/note-structure/use-note-data-loader";

interface NoteDataLoaderProps {
  noteId: string | null;
  isSharedView?: boolean; // 공유 모드 여부
  children: React.ReactNode;
}

export function NoteDataLoader({ noteId, isSharedView = false, children }: NoteDataLoaderProps) {
  const { data: note, isLoading, error } = useNote(noteId, { enabled: !isSharedView });

  // 파일 목록만 로드 (blocks는 BlockNote 에디터가 직접 관리)
  useNoteDataLoader({ noteId });

  // Debug logs
  console.log('[NoteDataLoader] Current state:', {
    noteId,
    hasNote: !!note,
    isLoading,
    error: error?.message,
    noteData: note
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

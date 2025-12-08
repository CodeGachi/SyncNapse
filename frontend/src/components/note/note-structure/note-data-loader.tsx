/**
 * 노트 데이터 로더
 *
 * IndexedDB를 단일 진실 공급원으로 사용
 * blocks 상태는 Zustand 대신 BlockNote 에디터와 IndexedDB가 직접 관리
 */

"use client";

import { useNote, useSharedNote } from "@/lib/api/queries/notes.queries";
import { useNoteDataLoader } from "@/features/note/note-structure/use-note-data-loader";
import { LoadingScreen } from "@/components/common/loading-screen";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("NoteDataLoader");

interface NoteDataLoaderProps {
  noteId: string | null;
  isSharedView?: boolean;
  children: React.ReactNode;
}

export function NoteDataLoader({ noteId, isSharedView = false, children }: NoteDataLoaderProps) {
  // 일반 모드: 로컬 DB 우선 조회
  const normalNote = useNote(noteId, { enabled: !isSharedView && !!noteId });

  // 공유 모드: 백엔드에서 직접 조회 (로컬 DB 건너뜀)
  const sharedNote = useSharedNote(noteId, { enabled: isSharedView && !!noteId });

  // 현재 모드에 맞는 결과 사용
  const { data: note, isLoading, error } = isSharedView ? sharedNote : normalNote;

  // 파일 목록만 로드 (blocks는 BlockNote 에디터가 직접 관리)
  // 공유 모드에서는 IndexedDB 파일 로드 건너뛰기 (Liveblocks Storage 사용)
  useNoteDataLoader({ noteId, isSharedView });

  log.debug("현재 상태:", {
    noteId,
    hasNote: !!note,
    isLoading,
    isSharedView,
    error: error?.message,
    noteData: note,
  });

  // 로딩 상태 처리
  if (isLoading) {
    log.debug("노트 로딩 중, ID:", noteId);
    return <LoadingScreen message="노트 불러오는 중..." />;
  }

  // 노트가 없는 경우
  if (!note && noteId) {
    log.error("노트를 찾을 수 없음, ID:", noteId);
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-foreground text-xl">
          노트를 찾을 수 없습니다.
          <div className="text-sm text-foreground-secondary mt-2">Note ID: {noteId}</div>
          {isSharedView && (
            <div className="text-sm text-foreground-tertiary mt-1">
              공유 링크가 유효하지 않거나 접근 권한이 없습니다.
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

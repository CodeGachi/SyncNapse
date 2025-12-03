/**
 * 협업 데이터 동기화 컴포넌트
 *
 * LiveblocksProvider 내부에서만 사용되므로 안전하게 Liveblocks hooks 호출 가능
 * - Educator: 노트 데이터를 Liveblocks Storage에 동기화
 * - Student (공유 모드): Liveblocks Storage로부터 노트 데이터 로드
 */

"use client";

import { useEffect } from "react";
import { useSharedNoteData, useSyncNoteToLiveblocks } from "@/features/note/collaboration";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useNoteEditorStore } from "@/stores";
import { LoadingScreen } from "@/components/common/loading-screen";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("CollaborationDataHandler");

interface CollaborationDataHandlerProps {
  isSharedView: boolean;
  isCollaborating: boolean;
  noteId: string;
  children?: React.ReactNode;
}

export function CollaborationDataHandler({
  isSharedView,
  isCollaborating,
  noteId,
  children,
}: CollaborationDataHandlerProps) {
  // 모든 모드에서 로컬 DB에서 노트 조회
  // 공유 모드의 경우 use-shared-note-data에서 생성한 임시 노트를 로드
  const { data: note } = useNote(noteId);
  const isEducatorNote = note?.type === "educator";
  const { files: uploadedFiles } = useNoteEditorStore();

  useEffect(() => {
    log.debug("초기화:", {
      isSharedView,
      isCollaborating,
      isEducatorNote,
      uploadedFilesCount: uploadedFiles.length,
    });
  }, [isSharedView, isCollaborating, isEducatorNote, uploadedFiles.length]);

  // Student (공유 모드): Liveblocks Storage에서 노트 데이터 로드
  // 백엔드에서 노트를 받거나 임시 빈 노트를 생성
  const { isLoading } = useSharedNoteData({
    isSharedView,
    noteId,
  });

  // Educator (협업 시작 시): 노트 데이터를 Liveblocks Storage에 동기화
  useSyncNoteToLiveblocks({
    isCollaborating,
    isEducator: isEducatorNote && !isSharedView,
    note: note || null,
    files: uploadedFiles,
  });

  // 공유 모드 로딩 중: 임시 노트 생성 또는 백엔드 노트 로드 대기
  if (isSharedView && (isLoading || !note)) {
    return (
      <div className="flex flex-col gap-3 flex-1">
        <LoadingScreen
          message={!note ? "노트를 불러오는 중입니다..." : "Liveblocks 연결 대기 중..."}
        />
      </div>
    );
  }

  return <>{children}</>;
}

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
  // 공유 모드에서는 로컬 DB 쿼리 비활성화 (Liveblocks Storage만 사용)
  const { data: note } = useNote(noteId, { enabled: !isSharedView });
  const isEducatorNote = note?.type === "educator";
  const { files: uploadedFiles } = useNoteEditorStore();

  useEffect(() => {
    console.log(`[CollaborationDataHandler] 초기화`);
    console.log(`  - 공유 모드: ${isSharedView}`);
    console.log(`  - 협업 중: ${isCollaborating}`);
    console.log(`  - 교육자 노트: ${isEducatorNote}`);
    console.log(`  - 업로드된 파일 수: ${uploadedFiles.length}`);
  }, [isSharedView, isCollaborating, isEducatorNote, uploadedFiles.length]);

  // Student (공유 모드): Liveblocks Storage에서 노트 데이터 로드
  const { isLoading, noteInfo } = useSharedNoteData({
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

  // 공유 모드 로딩 중일 때 로딩 화면 표시
  if (isSharedView && isLoading) {
    return (
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#AFC02B] mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">공유 노트 로딩 중...</p>
            <p className="text-gray-500 text-sm mt-2">
              교육자가 공유한 노트를 불러오고 있습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 공유 모드에서 noteInfo가 아직 없으면 빈 화면 표시
  // (Educator가 아직 협업을 시작하지 않은 경우)
  if (isSharedView && !noteInfo) {
    return (
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-[#AFC02B] text-6xl mb-4">📝</div>
            <p className="text-gray-400 text-lg mb-2">아직 공유된 노트가 없습니다</p>
            <p className="text-gray-500 text-sm">
              교육자가 협업을 시작하면 노트가 표시됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

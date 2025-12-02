/**
 * 교육자 노트 컨텐츠 컴포넌트
 *
 * 학생 구조와 동일하되 협업 기능 추가:
 * - CollaborationDataHandler (Liveblocks 데이터 동기화)
 * - EmojiReactions (협업 이모지 오버레이)
 * - RightSidePanel (협업 패널 포함)
 */

"use client";

import { useEffect } from "react";
import { NoteHeader } from "@/components/note/note-structure/note-header";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { CollaborationDataHandler } from "@/components/note/collaboration/collaboration-data-handler";
import { EmojiReactions } from "@/components/note/collaboration/emoji-reactions";
import { SharingSettingsModal } from "@/components/note/modals/sharing-settings-modal";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";
import { usePanelsStore } from "@/stores";

interface EducatorNoteContentProps {
  noteId: string;
  noteTitle: string;
  isSharedView: boolean;
}

export function EducatorNoteContent({
  noteId,
  noteTitle,
  isSharedView,
}: EducatorNoteContentProps) {
  // 백엔드 인증 사용자 정보 (협업 이모지용)
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "";
  const userName = currentUser?.name || currentUser?.email || "사용자";

  // 패널 상태 초기화
  const resetPanels = usePanelsStore((state) => state.reset);
  useEffect(() => {
    resetPanels();
  }, [resetPanels]);

  return (
    <div className="flex items-start bg-background-surface h-screen w-full">
      {/* 헤더 - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
        isEducatorNote={true}
      />

      {/* 공유 설정 모달 - Zustand로 관리 */}
      <SharingSettingsModal />

      {/* 데이터 로더 - 파일 목록 로드 + 노트 검증 */}
      <NoteDataLoader noteId={noteId}>
        {/* 협업 데이터 핸들러 - Liveblocks 데이터 동기화 */}
        <CollaborationDataHandler
          noteId={noteId}
          isCollaborating={true}
          isSharedView={isSharedView}
        >
          {/* 메인 레이아웃 - 뷰어 + 패널 + 아이콘 */}
          <main className="flex-1 h-full">
            <div className="flex gap-1 h-full pt-20 px-2 pb-4">
              {/* 메인 컨텐츠 영역 - PDF 뷰어 + BlockNote 에디터 (협업) */}
              <NoteContentArea
                noteId={noteId}
                noteTitle={noteTitle}
                isCollaborating={true}
                isSharedView={isSharedView}
                isEducator={!isSharedView}
              />

              {/* 우측 사이드 패널 - 스크립트, 파일, 협업 등 */}
              <RightSidePanel noteId={noteId} isEducator={true} />

              {/* 우측 사이드바 아이콘 - 패널 닫혔을 때 */}
              <SidebarIcons noteId={noteId} isEducator={true} />

              {/* 협업 이모지 반응 오버레이 */}
              {userId && userName && (
                <EmojiReactions
                  noteId={noteId}
                  userId={userId}
                  userName={userName}
                />
              )}
            </div>
          </main>
        </CollaborationDataHandler>
      </NoteDataLoader>
    </div>
  );
}

/**
 * Educator 노트 페이지 (Client Component)
 *
 * Student 구조와 동일하되 협업 기능 추가:
 * - CollaborationDataHandler (Liveblocks 데이터 동기화)
 * - EmojiReactions (협업 이모지 오버레이)
 * - RightSidePanelEducator (협업 패널 포함)
 */

"use client";

import { useEffect } from "react";
import { NoteHeader } from "@/components/note/note-structure/note-header";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { CollaborationDataHandler } from "@/components/note/collaboration/shared-note-data-loader";
import { EmojiReactions } from "@/components/note/collaboration/emoji-reactions";
import { SharingSettingsModal } from "@/components/note/shared/sharing-settings-modal";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";
import { usePanelsStore } from "@/stores";

interface EducatorNotePageProps {
  params: {
    noteId: string;
  };
  searchParams: {
    title?: string;
    view?: string;    // 공유 링크: "shared"
    token?: string;   // 공유 토큰
  };
}

export default function EducatorNotePage({
  params,
  searchParams,
}: EducatorNotePageProps) {
  const { noteId } = params;
  const noteTitle = searchParams.title || "제목 없음";

  // 공유 링크로 접속한 학생인지 확인
  const isSharedView = searchParams.view === "shared" && !!searchParams.token;

  // 백엔드 인증 사용자 정보 가져오기 (협업 이모지용)
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "";
  const userName = currentUser?.name || currentUser?.email || "사용자";

  // 패널 상태 초기화
  const resetPanels = usePanelsStore((state) => state.reset);
  useEffect(() => {
    resetPanels();
  }, [resetPanels]);

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* Header - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
        isEducatorNote={true}
      />

      {/* 공유 설정 모달 - Zustand로 관리 */}
      <SharingSettingsModal />

      {/* Data Loader - Client Component (파일 목록 로드 + 노트 검증) */}
      <NoteDataLoader noteId={noteId}>
        {/* Collaboration Data Handler - Liveblocks 데이터 동기화 */}
        <CollaborationDataHandler
          noteId={noteId}
          isCollaborating={true}
          isSharedView={isSharedView}
        >
          {/* Main Layout - 뷰어 + 패널 + 아이콘 Flexbox 배치 */}
          <main className="flex-1 h-full min-w-0 overflow-hidden">
            <div className="flex gap-1 h-full pt-20 px-2 pb-4 overflow-hidden">
              {/* Main Content Area - PDF 뷰어 + BlockNote 에디터 (협업) */}
              <NoteContentArea
                noteId={noteId}
                noteTitle={noteTitle}
                isCollaborating={true}
                isSharedView={isSharedView}
                isEducator={!isSharedView}
              />

              {/* Right Side Panel - 통합 (Script, File, Etc, Collaboration) */}
              <RightSidePanel noteId={noteId} isEducator={true} />

              {/* Right Sidebar Icons (패널 닫혔을 때) */}
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

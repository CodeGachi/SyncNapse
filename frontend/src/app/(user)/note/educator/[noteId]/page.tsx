/**
 * Educator 노트 페이지
 *
 * 개인 편집 모드 + 실시간 협업 모드 통합
 * - 기본: 개인 편집 (Liveblocks 비활성화)
 * - 협업 시작: Liveblocks 활성화
 * - 참여자 접속: ?join=token 파라미터
 */

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NoteSidebar } from "@/components/note/note-structure/note-sidebar";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/note-structure/note-layout-wrapper";
import { LiveblocksProvider } from "@/providers/liveblocks-provider";
import { CollaborationDataHandler } from "@/components/note/collaboration/shared-note-data-loader";

interface EducatorNotePageProps {
  params: {
    noteId: string;
  };
}

export default function EducatorNotePage({ params }: EducatorNotePageProps) {
  const { noteId } = params;
  const searchParams = useSearchParams();
  const noteTitle = searchParams.get("title") || "제목 없음";
  const joinToken = searchParams.get("join"); // 참여자 접속 시 토큰
  const viewMode = searchParams.get("view"); // 공유 링크 접속 모드 (shared)
  const shareToken = searchParams.get("token"); // 공유 링크 토큰

  // 초기값 계산: URL 파라미터로부터 공유/협업 모드 확인
  const isSharedViewInitial = viewMode === "shared" && !!shareToken;
  const isCollaboratingInitial = isSharedViewInitial || !!joinToken;

  // 협업 모드 state (초기값을 URL 파라미터로부터 설정)
  const [isCollaborating, setIsCollaborating] = useState(isCollaboratingInitial);
  // 공유 모드 state (초기값을 URL 파라미터로부터 설정)
  const [isSharedView, setIsSharedView] = useState(isSharedViewInitial);

  useEffect(() => {
    // 공유 링크로 접속한 경우 로그
    if (isSharedViewInitial) {
      console.log(`[공유 모드] 노트 ${noteId}에 공유 링크로 접속했습니다.`);
    }
    // 참여자가 join 토큰으로 접속한 경우 로그
    else if (joinToken) {
      console.log(`[협업 모드] 노트 ${noteId}에 참여했습니다.`);
    }
  }, [isSharedViewInitial, joinToken, noteId]);

  // 협업 시작 핸들러
  const handleStartCollaboration = () => {
    setIsCollaborating(true);
  };

  // 협업 종료 핸들러
  const handleStopCollaboration = () => {
    setIsCollaborating(false);
  };

  // 노트 컴포넌트
  const noteContent = (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full relative">
      {/* Left Sidebar - Server Component */}
      <NoteSidebar />

      {/* Data Loader - Client Component (TanStack Query + AutoSave) */}
      <NoteDataLoader noteId={noteId} isSharedView={isSharedView}>
        {/* Main Layout Wrapper - Client Component (isExpanded Status Management) */}
        <NoteLayoutWrapper>
          {/* Main Content Area - Client Component (includes sharing settings) */}
          <NoteContentArea
            noteId={noteId}
            noteTitle={noteTitle}
            isCollaborating={isCollaborating}
            isSharedView={isSharedView}
            onStartCollaboration={handleStartCollaboration}
            onStopCollaboration={handleStopCollaboration}
          />

          {/* Right Side Panel - Client Component */}
          <RightSidePanel
            noteId={noteId}
            isCollaborating={isCollaborating}
            isSharedView={isSharedView}
          />

          {/* Right Sidebar Icon (When closed) - Client Component */}
          <SidebarIcons noteId={noteId} />
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );

  // 조건부 Liveblocks Provider
  if (isCollaborating) {
    return (
      <LiveblocksProvider noteId={noteId}>
        <CollaborationDataHandler
          isSharedView={isSharedView}
          isCollaborating={isCollaborating}
          noteId={noteId}
        >
          {noteContent}
        </CollaborationDataHandler>
      </LiveblocksProvider>
    );
  }

  return noteContent;
}

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

  // 협업 모드 state
  const [isCollaborating, setIsCollaborating] = useState(false);

  useEffect(() => {
    // 참여자가 join 토큰으로 접속한 경우 자동으로 협업 모드 활성화
    if (joinToken) {
      setIsCollaborating(true);
    }
  }, [joinToken]);

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
      <NoteDataLoader noteId={noteId}>
        {/* Main Layout Wrapper - Client Component (isExpanded Status Management) */}
        <NoteLayoutWrapper>
          {/* Main Content Area - Client Component (includes sharing settings) */}
          <NoteContentArea
            noteId={noteId}
            noteTitle={noteTitle}
            isCollaborating={isCollaborating}
            onStartCollaboration={handleStartCollaboration}
            onStopCollaboration={handleStopCollaboration}
          />

          {/* Right Side Panel - Client Component */}
          <RightSidePanel noteId={noteId} isCollaborating={isCollaborating} />

          {/* Right Sidebar Icon (When closed) - Client Component */}
          <SidebarIcons noteId={noteId} />
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );

  // 조건부 Liveblocks Provider
  if (isCollaborating) {
    return (
      <LiveblocksProvider noteId={noteId}>{noteContent}</LiveblocksProvider>
    );
  }

  return noteContent;
}

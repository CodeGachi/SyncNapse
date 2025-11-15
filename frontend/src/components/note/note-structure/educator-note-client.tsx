/**
 * Educator 노트 클라이언트 컴포넌트
 *
 * 클라이언트 전용 로직 (상태 관리, Liveblocks 통합)
 * - 개인 편집 모드 + 실시간 협업 모드
 * - EmojiReactions 오버레이
 */

"use client";

import { useState, useEffect } from "react";
import { NoteContentArea } from "./note-content-area";
import { RightSidePanel } from "./right-side-panel";
import { SidebarIcons } from "./sidebar-icons";
import { NoteDataLoader } from "./note-data-loader";
import { NoteLayoutWrapper } from "./note-layout-wrapper";
import { NoteHeader } from "./note-header";
import { LiveblocksProvider } from "@/providers/liveblocks-provider";
import { CollaborationDataHandler } from "@/components/note/collaboration/shared-note-data-loader";
import { EmojiReactions } from "@/components/note/collaboration/emoji-reactions";

interface EducatorNoteClientProps {
  noteId: string;
  noteTitle: string;
  joinToken: string | null;
  viewMode: string | null;
  shareToken: string | null;
}

export function EducatorNoteClient({
  noteId,
  noteTitle,
  joinToken,
  viewMode,
  shareToken,
}: EducatorNoteClientProps) {
  // 초기값 계산: URL 파라미터로부터 공유/협업 모드 확인
  const isSharedViewInitial = viewMode === "shared" && !!shareToken;
  const isCollaboratingInitial = isSharedViewInitial || !!joinToken;

  // 디버깅: URL 파라미터 확인
  console.log(`[EducatorNoteClient] ==================== 페이지 로드 ====================`);
  console.log(`[EducatorNoteClient] URL 파라미터:`, {
    noteId,
    noteTitle,
    joinToken: joinToken || 'null',
    viewMode: viewMode || 'null',
    shareToken: shareToken || 'null',
  });
  console.log(`[EducatorNoteClient] 계산된 초기값:`, {
    isSharedViewInitial,
    isCollaboratingInitial,
  });
  console.log(`[EducatorNoteClient] ====================================================`);

  // 협업 모드 state (초기값을 URL 파라미터로부터 설정)
  const [isCollaborating, setIsCollaborating] = useState(isCollaboratingInitial);
  // 공유 모드 state (초기값을 URL 파라미터로부터 설정)
  const [isSharedView, setIsSharedView] = useState(isSharedViewInitial);

  // State 변경 감지
  useEffect(() => {
    console.log(`[EducatorNoteClient] State 업데이트:`, {
      isCollaborating,
      isSharedView,
    });
  }, [isCollaborating, isSharedView]);

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

  // 임시 사용자 정보 (추후 인증 시스템과 통합)
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId") || `user-${Date.now()}`;
    const storedUserName = localStorage.getItem("userName") || "사용자";
    setUserId(storedUserId);
    setUserName(storedUserName);
  }, []);

  // 노트 컴포넌트
  const noteContent = (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full relative">
      {/* Header - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
        isSharedView={isSharedView}
        isCollaborating={isCollaborating}
        onStartCollaboration={handleStartCollaboration}
        onStopCollaboration={handleStopCollaboration}
      />

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

          {/* 협업 모드일 때만 이모지 반응 오버레이 표시 */}
          {isCollaborating && userId && userName && (
            <EmojiReactions noteId={noteId} userId={userId} userName={userName} />
          )}
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );

  // 조건부 Liveblocks Provider
  if (isCollaborating) {
    console.log(`[EducatorNoteClient] LiveblocksProvider 렌더링 - 협업 모드 활성화`);
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

  console.log(`[EducatorNoteClient] 일반 모드 렌더링 - 협업 비활성화`);
  return noteContent;
}

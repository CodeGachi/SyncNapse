/**
 * Educator 노트 페이지 (Client Component)
 *
 * Student 구조와 동일하되 협업 기능 추가:
 * - CollaborationDataHandler (Liveblocks 데이터 동기화)
 * - EmojiReactions (협업 이모지 오버레이)
 * - RightSidePanelEducator (협업 패널 포함)
 */

"use client";

import { useState, useEffect } from "react";
import { NoteHeader } from "@/components/note/note-structure/note-header";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/note-structure/note-layout-wrapper";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanelEducator } from "@/components/note/educator/right-side-panel-educator";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { CollaborationDataHandler } from "@/components/note/collaboration/shared-note-data-loader";
import { EmojiReactions } from "@/components/note/collaboration/emoji-reactions";

interface EducatorNotePageProps {
  params: {
    noteId: string;
  };
  searchParams: {
    title?: string;
  };
}

export default function EducatorNotePage({
  params,
  searchParams,
}: EducatorNotePageProps) {
  const { noteId } = params;
  const noteTitle = searchParams.title || "제목 없음";

  // 사용자 정보 로드 (협업 기능용)
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  // 공유 설정 관리
  const [sharingSettings, setSharingSettings] = useState({
    isPublic: false,
    allowedUsers: [] as string[],
    allowComments: true,
    realTimeInteraction: true,
    shareLink: undefined as string | undefined,
    expiresAt: undefined as number | undefined,
  });
  const [newUserEmail, setNewUserEmail] = useState("");

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const storedUserId = localStorage.getItem("userId") || `user-${Date.now()}`;
    const storedUserName = localStorage.getItem("userName") || "사용자";

    // 없으면 새로 생성하여 저장
    if (!localStorage.getItem("userId")) {
      localStorage.setItem("userId", storedUserId);
    }
    if (!localStorage.getItem("userName")) {
      localStorage.setItem("userName", storedUserName);
    }

    setUserId(storedUserId);
    setUserName(storedUserName);

    console.log(`[EducatorNotePage] 사용자 정보 로드: ${storedUserName} (${storedUserId})`);
  }, []);

  // 공유 설정 핸들러
  const togglePublic = () => {
    setSharingSettings((prev) => ({ ...prev, isPublic: !prev.isPublic }));
  };

  const addUser = () => {
    if (!newUserEmail || !newUserEmail.includes("@")) return;
    const updatedUsers = [...sharingSettings.allowedUsers];
    if (!updatedUsers.includes(newUserEmail)) {
      updatedUsers.push(newUserEmail);
      setSharingSettings((prev) => ({ ...prev, allowedUsers: updatedUsers }));
      setNewUserEmail("");
    }
  };

  const removeUser = (email: string) => {
    setSharingSettings((prev) => ({
      ...prev,
      allowedUsers: prev.allowedUsers.filter((u) => u !== email),
    }));
  };

  const toggleComments = () => {
    setSharingSettings((prev) => ({ ...prev, allowComments: !prev.allowComments }));
  };

  const toggleRealTimeInteraction = () => {
    setSharingSettings((prev) => ({
      ...prev,
      realTimeInteraction: !prev.realTimeInteraction,
    }));
  };

  const copyShareLink = async () => {
    if (!sharingSettings.shareLink) {
      // 토큰 형식: {noteId}-{timestamp}-{randomString}
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const token = `${noteId}-${timestamp}-${randomString}`;
      const shareLink = `${window.location.origin}/shared/${token}`;

      setSharingSettings((prev) => ({
        ...prev,
        shareLink,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
      }));

      try {
        await navigator.clipboard.writeText(shareLink);
        console.log("공유 링크가 복사되었습니다:", shareLink);
      } catch (error) {
        console.error("링크 복사 실패:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(sharingSettings.shareLink);
        console.log("공유 링크가 복사되었습니다:", sharingSettings.shareLink);
      } catch (error) {
        console.error("링크 복사 실패:", error);
      }
    }
  };

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* Header - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
        isCollaborating={true}
        sharingSettings={sharingSettings}
        newUserEmail={newUserEmail}
        onNewUserEmailChange={setNewUserEmail}
        onAddUser={addUser}
        onRemoveUser={removeUser}
        onTogglePublic={togglePublic}
        onToggleComments={toggleComments}
        onToggleRealTimeInteraction={toggleRealTimeInteraction}
        onCopyShareLink={copyShareLink}
      />

      {/* Data Loader - Client Component (TanStack Query + AutoSave) */}
      <NoteDataLoader noteId={noteId}>
        {/* Collaboration Data Handler - Liveblocks 데이터 동기화 */}
        <CollaborationDataHandler
          noteId={noteId}
          isCollaborating={true}
          isSharedView={false}
        >
          {/* Main Layout Wrapper - Client Component (isExpanded Status Management) */}
          <NoteLayoutWrapper>
            {/* Main Content Area - Student와 동일 (PDF + Note) */}
            <NoteContentArea
              noteId={noteId}
              noteTitle={noteTitle}
              isCollaborating={true}
              isEducator={true}
            />

            {/* Right Side Panel - Educator (Script, File, Etc, Collaboration) */}
            <RightSidePanelEducator noteId={noteId} />

            {/* Right Sidebar Icons (When closed) */}
            <SidebarIcons noteId={noteId} isEducator={true} />

            {/* 협업 이모지 반응 오버레이 */}
            {userId && userName && (
              <EmojiReactions
                noteId={noteId}
                userId={userId}
                userName={userName}
              />
            )}
          </NoteLayoutWrapper>
        </CollaborationDataHandler>
      </NoteDataLoader>
    </div>
  );
}

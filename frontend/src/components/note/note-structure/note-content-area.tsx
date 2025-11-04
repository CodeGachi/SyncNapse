/**
 * 노트 메인 콘텐츠 영역 - Client Component
 * 제목, 파일 탭, PDF 뷰어, 노트 패널을 담당
 */

"use client";

import { useState } from "react";
import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useNoteContentArea } from "@/features/note/note-structure/use-note-content-area";
import { FileTabs } from "@/components/note/viewer/file-tabs";
import { CustomPdfViewer } from "@/components/note/viewer/custom-pdf-viewer";
import { NotePanel } from "@/components/note/editor/note-panel";
import { AutoSaveBadge } from "@/components/note/editor/auto-save-badge";
import { SharingSettingsModal } from "@/components/note/sharing/sharing-settings-modal";

interface NoteContentAreaProps {
  noteId: string | null;
  noteTitle: string;
}

export function NoteContentArea({ noteId, noteTitle }: NoteContentAreaProps) {
  // 실제 노트 데이터로부터 제목 가져오기
  const { data: note } = useNote(noteId);
  const actualTitle = note?.title || noteTitle;
  const isEducatorNote = note?.type === "educator";

  // 공유 설정 관리
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [sharingSettings, setSharingSettings] = useState(
    note?.accessControl || {
      isPublic: false,
      allowedUsers: [],
      allowComments: true,
      realTimeInteraction: true,
    }
  );
  const [newUserEmail, setNewUserEmail] = useState("");

  const togglePublic = () => {
    setSharingSettings((prev) => ({
      ...prev,
      isPublic: !prev.isPublic,
    }));
  };

  const addUser = (email: string) => {
    if (!email || !email.includes("@")) return;
    const updatedUsers = [...(sharingSettings.allowedUsers || [])];
    if (!updatedUsers.includes(email)) {
      updatedUsers.push(email);
      setSharingSettings((prev) => ({
        ...prev,
        allowedUsers: updatedUsers,
      }));
      setNewUserEmail("");
    }
  };

  const removeUser = (email: string) => {
    setSharingSettings((prev) => ({
      ...prev,
      allowedUsers: (prev.allowedUsers || []).filter((u) => u !== email),
    }));
  };

  const toggleComments = () => {
    setSharingSettings((prev) => ({
      ...prev,
      allowComments: !prev.allowComments,
    }));
  };

  const toggleRealTimeInteraction = () => {
    setSharingSettings((prev) => ({
      ...prev,
      realTimeInteraction: !prev.realTimeInteraction,
    }));
  };

  const copyShareLink = async () => {
    if (!sharingSettings.shareLink) {
      const token = Math.random().toString(36).substring(2, 15);
      const shareLink = `${window.location.origin}/shared/${token}`;
      setSharingSettings((prev) => ({
        ...prev,
        shareLink,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      }));
    }
    if (sharingSettings.shareLink) {
      try {
        await navigator.clipboard.writeText(sharingSettings.shareLink);
      } catch (error) {
        console.error("링크 복사 실패:", error);
      }
    }
  };

  const {
    files: uploadedFiles,
    openedTabs,
    removeFile,
    selectedFileId,
    selectFile,
    activeTab,
    setActiveTab,
    isExpanded,
    toggleExpand,
    autoSaveStatus,
    lastSavedAt,
    closeTab,
    getOpenedFiles,
  } = useNoteEditorStore();

  const { isNotePanelOpen } = usePanelsStore();

  // 열린 파일들 가져오기
  const openedFiles = getOpenedFiles();

  const {
    showExpandButton,
    viewerHeight,
    isDragging,
    containerRef,
    setIsDragging,
    handleTabChange,
    handleTabClose,
    convertFilesForTabs,
  } = useNoteContentArea({
    openedFiles,
    setActiveTab,
    selectFile,
    closeTab,
  });

  // 탭용 파일 형식으로 변환
  const files = convertFilesForTabs();

  // 선택된 파일 가져오기
  const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* 제목 영역 */}
      <div className="flex justify-between items-center px-2.5 min-h-[39px]">
        <div className="flex items-center gap-4">
          <h1 className="text-[32px] font-bold text-white leading-[39px]">
            {actualTitle}
          </h1>

          {/* 자동저장 배지 */}
          <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} />

          {/* 강의 노트 공유 설정 버튼 (아이콘만) */}
          {isEducatorNote && (
            <>
              <button
                onClick={() => setIsSharingOpen(!isSharingOpen)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#AFC02B] transition-colors cursor-pointer"
                title="공유 설정"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>

              {/* 공유 설정 모달 */}
              <SharingSettingsModal
                isOpen={isSharingOpen}
                onClose={() => setIsSharingOpen(false)}
                settings={sharingSettings}
                newUserEmail={newUserEmail}
                onNewUserEmailChange={setNewUserEmail}
                onAddUser={addUser}
                onRemoveUser={removeUser}
                onTogglePublic={togglePublic}
                onToggleComments={toggleComments}
                onToggleRealTimeInteraction={toggleRealTimeInteraction}
                onCopyShareLink={copyShareLink}
                shareLink={sharingSettings.shareLink}
              />
            </>
          )}
        </div>

        {/* 사이드바 확장 버튼 (화면이 충분히 클 때만 표시) */}
        {showExpandButton && (
          <button
            onClick={toggleExpand}
            className="w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4h16v16H4V4z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 4v16"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={isExpanded ? "M14 10l3 2-3 2" : "M14 10l-3 2 3 2"}
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 탭 + PDF 뷰어 + 노트 패널 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <FileTabs
          files={files}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />

        {/* PDF 뷰어와 노트 패널을 세로로 나란히 배치 */}
        <div ref={containerRef} className="flex-1 flex flex-col gap-0 overflow-hidden min-h-0">
          {/* PDF 뷰어 - 상단 */}
          <div
            className="overflow-hidden"
            style={{ height: isNotePanelOpen ? `${viewerHeight}%` : '100%' }}
          >
            <CustomPdfViewer
              fileUrl={selectedFile?.url}
              fileName={selectedFile?.name}
              fileType={selectedFile?.type}
            />
          </div>

          {/* 드래그 가능한 디바이더 */}
          {isNotePanelOpen && (
            <div
              onMouseDown={() => setIsDragging(true)}
              className="h-1 bg-[#444444] hover:bg-[#666666] cursor-ns-resize transition-colors relative group"
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 flex items-center justify-center">
                <div className="w-12 h-1 bg-[#666666] rounded-full group-hover:bg-white transition-colors" />
              </div>
            </div>
          )}

          {/* 노트 패널 - 하단 */}
          {isNotePanelOpen && (
            <div
              className="overflow-y-auto bg-[#1e1e1e]"
              style={{ height: `${100 - viewerHeight}%` }}
            >
              <NotePanel isOpen={isNotePanelOpen} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

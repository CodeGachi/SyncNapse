/**
 * 우측 사이드 패널 (통합) - Student & Educator
 * 스크립트, 파일, AI 챗봇 패널 + 협업 패널(Educator 전용)
 *
 * Refactored: Business logic separated to features/note/right-panel/
 */

"use client";

import { useEffect } from "react";
import { useNoteEditorStore, usePanelsStore, useScriptTranslationStore, useNoteUIStore } from "@/stores";
import {
  useFileManagement,
  useTranscriptTranslation,
} from "@/features/note/right-panel";
import { useAudioPlayer, useAudioPlayback } from "@/features/note/recording";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";

// UI Components
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { TranscriptTimeline } from "@/components/note/panels/transcript-timeline";
import { FilePanel } from "@/components/note/panels/file-panel";
import { ChatbotPanel } from "@/components/note/panels/chatbot-panel";
import { CollaborationPanel } from "@/components/note/collaboration/collaboration-panel";

import { motion } from "framer-motion";

interface RightSidePanelProps {
  noteId: string | null;
  isEducator?: boolean; // 교육자 노트 여부
}

export function RightSidePanel({ noteId, isEducator = false }: RightSidePanelProps) {
  // 백엔드 인증 사용자 정보 가져오기
  const { data: currentUser } = useCurrentUser();

  // Educator 전용: 협업 기능용 사용자 정보
  const userId = currentUser?.id || "";
  const userName = currentUser?.name || currentUser?.email || "사용자";

  useEffect(() => {
    if (isEducator && currentUser) {
      console.log(`[RightSidePanel] 인증된 사용자 정보: ${userName} (${userId})`);
    }
  }, [isEducator, currentUser, userName, userId]);

  // Store states (useEffect 전에 먼저 선언)
  const {
    files: uploadedFiles,
    selectedFileId,
    selectFile,
    openFileInTab,
    renameFile,
    copyFile,
  } = useNoteEditorStore();

  const { scriptSegments, reset: resetScriptTranslation } = useScriptTranslationStore();

  // noteId 변경 시 스크립트 초기화 (노트 진입/변경 시)
  useEffect(() => {
    console.log(`[RightSidePanel] Note mounted/changed: ${noteId} - resetting script`);
    resetScriptTranslation();
  }, [noteId, resetScriptTranslation]);

  // UI Store
  const { isExpanded, toggleExpand } = useNoteUIStore();

  const {
    isFilePanelOpen,
    toggleFilePanel,
    isScriptOpen,
    toggleScript,
    isChatbotPanelOpen,
    toggleChatbotPanel,
    isCollaborationPanelOpen,
    toggleCollaborationPanel,
  } = usePanelsStore();

  // 모든 개별 패널이 닫히면 500px 패널도 자동으로 닫기
  useEffect(() => {
    const allPanelsClosed = isEducator
      ? !isScriptOpen && !isFilePanelOpen && !isChatbotPanelOpen && !isCollaborationPanelOpen
      : !isScriptOpen && !isFilePanelOpen && !isChatbotPanelOpen;

    if (allPanelsClosed && isExpanded) {
      console.log('[RightSidePanel] 모든 패널 닫힘 - 500px 패널 자동 닫기');
      toggleExpand();
    }
  }, [isScriptOpen, isFilePanelOpen, isChatbotPanelOpen, isCollaborationPanelOpen, isExpanded, toggleExpand, isEducator]);

  // Audio player for playback (used by ScriptPanel)
  const {
    audioRef,
    isPlaying,
    togglePlay,
  } = useAudioPlayer();

  // ✅ Audio playback controls and script synchronization (separated to custom hook)
  const {
    currentTime,
    activeSegmentId,
    handleAudioPlayToggle,
    handleAudioStop,
    handleSeek,
  } = useAudioPlayback({
    audioRef,
    scriptSegments,
    isPlaying,
    togglePlay,
  });

  // ✅ noteId 전달하여 IndexedDB에 저장되도록 수정
  const { handleAddFile, handleRemoveFile } = useFileManagement({ noteId });

  const { isTranslating, translationSupported } = useTranscriptTranslation();

  return (
    <>
      {/* 사이드 패널 - 확장시에만 표시 */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        className={`flex flex-col bg-[#1e1e1e] overflow-hidden ${isExpanded ? "flex-shrink-0 w-[370px] gap-2 pt-6 px-3" : "w-0 p-0"
          }`}
      >
        {isExpanded && (
          <>

            {/* 스크립트 패널 */}
            <ScriptPanel
              isOpen={isScriptOpen}
              onClose={toggleScript}
              audioRef={audioRef}
              activeSegmentId={activeSegmentId}
              isTranslating={isTranslating}
              translationSupported={translationSupported}
            />

            {/* 타임라인 (스크립트가 열려있고 세그먼트가 있을 때만 표시) */}
            {isScriptOpen && scriptSegments.length > 0 && (
              <TranscriptTimeline
                segments={scriptSegments}
                audioRef={audioRef}
                activeSegmentId={activeSegmentId}
                onSeek={handleSeek}
                className="mt-3"
              />
            )}

            {/* 파일 패널 */}
            <FilePanel
              isOpen={isFilePanelOpen}
              files={uploadedFiles}
              onAddFile={handleAddFile}
              onRemoveFile={handleRemoveFile}
              selectedFileId={selectedFileId}
              onSelectFile={selectFile}
              onOpenFileInTab={openFileInTab}
              onRenameFile={renameFile}
              onCopyFile={copyFile}
              onClose={toggleFilePanel}
            />

            {/* AI 챗봇 패널 */}
            <ChatbotPanel isOpen={isChatbotPanelOpen} onClose={toggleChatbotPanel} noteId={noteId} />

            {/* 협업 패널 (Educator 전용, Liveblocks 실시간) */}
            {isEducator && (
              <CollaborationPanel
                isOpen={isCollaborationPanelOpen}
                userId={userId}
                userName={userName}
                noteId={noteId!}
                isEducator={true}
                onClose={toggleCollaborationPanel}
              />
            )}
          </>
        )}
      </motion.div>
    </>
  );
}

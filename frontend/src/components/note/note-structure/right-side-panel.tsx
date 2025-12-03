/**
 * 우측 사이드 패널 (통합) - Student & Educator
 * 스크립트, 파일, AI 챗봇 패널 + 협업 패널(Educator 전용)
 *
 */

"use client";

import { useEffect, useCallback } from "react";
import { useNoteEditorStore, usePanelsStore, useScriptTranslationStore, useNoteUIStore, useAudioPlayerStore } from "@/stores";
import type { PageContext } from "@/lib/types";
import {
  useFileManagement,
  useScriptRevision,
} from "@/features/note/right-panel";
import { useAudioPlayer, useAudioPlayback } from "@/features/note/recording";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";
import { createLogger } from "@/lib/utils/logger";

// UI Components
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { FilePanel } from "@/components/note/panels/file-panel";
import { ChatbotPanel } from "@/components/note/panels/chatbot-panel";
import { CollaborationPanel } from "@/components/note/collaboration/collaboration-panel";

import { motion } from "framer-motion";

const log = createLogger("RightSidePanel");

interface RightSidePanelProps {
  noteId: string | null;
  isEducator?: boolean; // 교육자 노트 여부
  isSharedView?: boolean; // 공유 링크로 접속한 학생인지 여부
}

export function RightSidePanel({ noteId, isEducator = false, isSharedView = false }: RightSidePanelProps) {
  // 백엔드 인증 사용자 정보 가져오기
  const { data: currentUser } = useCurrentUser();

  // Educator 전용: 협업 기능용 사용자 정보
  const userId = currentUser?.id || "";
  const userName = currentUser?.name || currentUser?.email || "사용자";

  useEffect(() => {
    if (isEducator && currentUser) {
      log.debug(`인증된 사용자 정보: ${userName} (${userId})`);
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
    setCurrentPage,
  } = useNoteEditorStore();

  const { scriptSegments, setScriptSegments, reset: resetScriptTranslation } = useScriptTranslationStore();

  // noteId 변경 시 스크립트 초기화 (노트 진입/변경 시)
  useEffect(() => {
    log.debug(`노트 마운트/변경: ${noteId} - 스크립트 초기화`);
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
      log.debug("모든 패널 닫힘 - 500px 패널 자동 닫기");
      toggleExpand();
    }
  }, [isScriptOpen, isFilePanelOpen, isChatbotPanelOpen, isCollaborationPanelOpen, isExpanded, toggleExpand, isEducator]);

  // Audio player for playback (used by ScriptPanel)
  const {
    audioRef,
    isPlaying,
    togglePlay,
  } = useAudioPlayer();

  // 🔥 전역 스토어에서 currentSessionId 가져오기 (편집 시 리비전 저장용)
  const { currentSessionId } = useAudioPlayerStore();

  // ✅ Audio playback controls and script synchronization (separated to custom hook)
  const {
    activeSegmentId,
  } = useAudioPlayback({
    audioRef,
    scriptSegments,
    isPlaying,
    togglePlay,
  });

  // ✅ noteId 전달하여 IndexedDB에 저장되도록 수정
  const { handleAddFile, handleRemoveFile } = useFileManagement({ noteId });

  // DeepL 번역 Hook은 ScriptPanel 내부에서 직접 사용됨

  // 페이지 컨텍스트 클릭 핸들러 - 해당 파일/페이지로 이동
  // backendId (fileId)를 사용하여 안정적으로 파일 식별
  const handlePageContextClick = useCallback((context: PageContext) => {
    log.debug("페이지 컨텍스트 클릭:", {
      fileId: context.fileId,
      pageNumber: context.pageNumber,
      uploadedFilesCount: uploadedFiles.length,
      uploadedFiles: uploadedFiles.map(f => ({ id: f.id, name: f.name, backendId: f.backendId })),
    });

    // fileId (backendId)로 해당 파일 찾기
    if (context.fileId) {
      const targetFile = uploadedFiles.find((f) => f.backendId === context.fileId);
      if (targetFile) {
        log.debug("파일 열기:", targetFile.name, "페이지:", context.pageNumber);
        openFileInTab(targetFile.id);
      } else {
        log.warn("backendId로 파일을 찾을 수 없음:", context.fileId);
      }
    }

    // 페이지 이동 (useNoteEditorStore의 setCurrentPage 사용)
    log.debug("현재 페이지 설정:", context.pageNumber);
    setCurrentPage(context.pageNumber);
  }, [uploadedFiles, openFileInTab, setCurrentPage]);

  // 파일 목록을 ScriptPanel에 전달할 형식으로 변환 (backendId 포함)
  const filesForScriptPanel = uploadedFiles.map((file) => ({
    id: file.id,
    name: file.name,
    backendId: file.backendId,
  }));

  // 스크립트 리비전 관리 훅
  const { handleSaveRevision } = useScriptRevision({
    scriptSegments,
    setScriptSegments,
  });

  return (
    <>
      {/* 사이드 패널 - 확장시에만 표시 */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        className={`flex flex-col bg-background-surface overflow-hidden ${isExpanded ? "flex-shrink-0 w-[280px] md:w-[320px] lg:w-[370px] gap-2 pt-6 px-2 md:px-3" : "w-0 p-0"
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
              onPageContextClick={handlePageContextClick}
              files={filesForScriptPanel}
              sessionId={currentSessionId || undefined}
              onSaveRevision={handleSaveRevision}
            />

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
                isEducator={!isSharedView}
                onClose={toggleCollaborationPanel}
              />
            )}
          </>
        )}
      </motion.div>
    </>
  );
}

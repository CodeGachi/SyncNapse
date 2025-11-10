/**
 * 노트 우측 사이드 패널 - Client Component
 * 녹음바, 스크립트, 파일, etc, 태그 패널을 담당
 *
 * Refactored: Business logic separated to features/note/right-panel/
 */

"use client";

import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useRecordingList } from "@/features/note/player";
import {
  useRecordingControl,
  useAudioPlayer,
  useFileManagement,
} from "@/features/note/right-panel";

// UI Components
import { RecordingBar } from "@/components/note/recording/recording-bar";
import { RecordingNameModal } from "@/components/note/recording/recording-name-modal";
import { CategoryButtons } from "@/components/note/note-structure/category-buttons";
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { FilePanel } from "@/components/note/panels/file-panel";
import { EtcPanel } from "@/components/note/panels/etc-panel";
import { TagsPanel } from "@/components/note/panels/tags-panel";
import { CollaborationPanel } from "@/components/note/collaboration/collaboration-panel";

interface RightSidePanelProps {
  noteId: string | null;
  isCollaborating?: boolean;
}

export function RightSidePanel({ noteId, isCollaborating = false }: RightSidePanelProps) {
  // Get note data to determine if it's an educator note
  const { data: note } = useNote(noteId);
  const isEducatorNote = note?.type === "educator";

  // Store states
  const {
    files: uploadedFiles,
    removeFile,
    selectedFileId,
    selectFile,
    openFileInTab,
    renameFile,
    copyFile,
    activeCategories,
    toggleCategory,
    isExpanded,
    currentTime,
  } = useNoteEditorStore();

  const {
    isNotePanelOpen,
    toggleNotePanel,
    isFilePanelOpen,
    toggleFilePanel,
    isScriptOpen,
    toggleScript,
    isEtcPanelOpen,
    toggleEtcPanel,
    isTagsPanelOpen,
    toggleTagsPanel,
    isCollaborationPanelOpen,
    toggleCollaborationPanel,
  } = usePanelsStore();

  // Recording list
  const {
    recordings: formattedRecordings,
    isExpanded: isRecordingExpanded,
    toggleExpanded: toggleRecordingExpanded,
  } = useRecordingList();

  // Custom hooks for business logic
  const {
    isRecording,
    isPaused,
    recordingTime,
    isNameModalOpen,
    pendingRecordingData,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  } = useRecordingControl();

  const {
    audioRef,
    isPlaying,
    togglePlay,
    handleRecordingSelect,
    handleStopPlayback,
  } = useAudioPlayer();

  const { handleAddFile } = useFileManagement();

  // Combined play/pause handler
  const onPlayToggle = () => {
    handlePlayPause(isPlaying, audioRef.current);
    if (!isRecording) {
      togglePlay();
    }
  };

  // Combined stop handler
  const onStop = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStopPlayback();
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full flex flex-col gap-2 pt-6 px-4 bg-[#1e1e1e] transition-all duration-300 ${
        isExpanded ? "translate-x-0 w-[500px]" : "translate-x-full w-0"
      }`}
      style={{ zIndex: 20 }}
    >
      {isExpanded && (
        <>
          {/* 녹음바 */}
          <RecordingBar
            isPlaying={isRecording ? !isPaused : isPlaying}
            time={isRecording ? recordingTime : formatTime(currentTime)}
            onPlayToggle={onPlayToggle}
            onStop={onStop}
            isExpanded={isRecordingExpanded}
            onToggleExpand={toggleRecordingExpanded}
            recordings={formattedRecordings}
            isScriptOpen={isScriptOpen}
            onToggleScript={toggleScript}
            isRecording={isRecording}
            onRecordingSelect={handleRecordingSelect}
          />

          {/* 녹음 이름 설정 모달 */}
          <RecordingNameModal
            isOpen={isNameModalOpen}
            duration={pendingRecordingData?.duration || 0}
            onSave={handleSaveRecording}
            onCancel={handleCancelSave}
          />

          {/* 스크립트 패널 */}
          <ScriptPanel isOpen={isScriptOpen} onClose={toggleScript} />

          {/* 파일 패널 */}
          <FilePanel
            isOpen={isFilePanelOpen}
            files={uploadedFiles}
            onAddFile={handleAddFile}
            onRemoveFile={removeFile}
            selectedFileId={selectedFileId}
            onSelectFile={selectFile}
            onOpenFileInTab={openFileInTab}
            onRenameFile={renameFile}
            onCopyFile={copyFile}
          />

          {/* etc 패널 */}
          <EtcPanel isOpen={isEtcPanelOpen} />

          {/* tags 패널 */}
          <TagsPanel isOpen={isTagsPanelOpen} />

          {/* 협업 패널 (교육자 노트 + 협업 모드 활성화 시, Liveblocks 실시간) */}
          {isCollaborationPanelOpen && isEducatorNote && isCollaborating && (
            <CollaborationPanel
              userId="user-123" // TODO: Connect to actual user context
              userName="사용자" // TODO: Connect to actual user context
              noteId={noteId || ""} // Connected to current note ID
              isEducator={isEducatorNote}
            />
          )}

          {/* 카테고리 버튼 */}
          <CategoryButtons
            activeCategories={activeCategories}
            onCategoryToggle={toggleCategory}
            onNotesToggle={toggleNotePanel}
            isNotesOpen={isNotePanelOpen}
            onFilesToggle={toggleFilePanel}
            isFilesOpen={isFilePanelOpen}
            onEtcToggle={toggleEtcPanel}
            isEtcOpen={isEtcPanelOpen}
            onTagsToggle={toggleTagsPanel}
            isTagsOpen={isTagsPanelOpen}
            onCollaborationToggle={toggleCollaborationPanel}
            isCollaborationOpen={isCollaborationPanelOpen}
            isEducator={isEducatorNote}
          />
        </>
      )}
    </div>
  );
}

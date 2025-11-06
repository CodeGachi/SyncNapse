/**
 * 노트 우측 사이드 패널 - Client Component
 * 녹음바, 스크립트, 파일, etc, 태그 패널을 담당
 *
 * Refactored: Business logic separated to features/note/right-panel/
 */

"use client";

import { useState, useEffect } from "react";
import { useNoteEditorStore, usePanelsStore, useScriptTranslationStore } from "@/stores";
import { useRecordingList } from "@/features/note/player";
import {
  useRecordingControl,
  useAudioPlayer,
  useFileManagement,
  useQuestionManagement,
  useTranscriptTranslation,
} from "@/features/note/right-panel";

// UI Components
import { RecordingBar } from "@/components/note/recording/recording-bar";
import { RecordingNameModal } from "@/components/note/recording/recording-name-modal";
import { CategoryButtons } from "@/components/note/note-structure/category-buttons";
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { TranscriptTimeline } from "@/components/note/panels/transcript-timeline";
import { FilePanel } from "@/components/note/panels/file-panel";
import { EtcPanel } from "@/components/note/panels/etc-panel";
import { TagsPanel } from "@/components/note/panels/tags-panel";

export function RightSidePanel() {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

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
    questions,
    currentTime,
  } = useNoteEditorStore();

  const { scriptSegments } = useScriptTranslationStore();

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

  const { handleAddQuestion, deleteQuestion } = useQuestionManagement();

  const { isTranslating, translationSupported } = useTranscriptTranslation();

  // User info (for question authorship)
  const currentUser = { name: "사용자", email: "user@example.com" };

  // Track active transcript segment based on audio playback time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || scriptSegments.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const activeSegment = scriptSegments.find(
        (segment) => currentTime >= segment.timestamp && currentTime < segment.timestamp + 5 // 5 second window
      );
      setActiveSegmentId(activeSegment?.id || null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, scriptSegments]);

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

  // Handle timeline seek
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full flex flex-col gap-2 pt-6 px-4 bg-[#1e1e1e] transition-all duration-300 ${
        isExpanded ? "translate-x-0 w-[500px]" : "translate-x-full w-0"
      }`}
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
            onRemoveFile={removeFile}
            selectedFileId={selectedFileId}
            onSelectFile={selectFile}
            onOpenFileInTab={openFileInTab}
            onRenameFile={renameFile}
            onCopyFile={copyFile}
          />

          {/* etc 패널 */}
          <EtcPanel
            isOpen={isEtcPanelOpen}
            questions={questions}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={deleteQuestion}
            currentUser={currentUser}
          />

          {/* tags 패널 */}
          <TagsPanel isOpen={isTagsPanelOpen} />

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
          />
        </>
      )}
    </div>
  );
}

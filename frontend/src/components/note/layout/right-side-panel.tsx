/**
 * 노트 우측 사이드 패널 - Client Component
 * 녹음바, 스크립트, 파일, etc, 태그 패널을 담당
 */

"use client";

import { useState } from "react";
import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useRecordingList, useRecording, type RecordingData } from "@/features/note/player";
import { RecordingBar } from "@/components/note/recording/recording-bar";
import { RecordingNameModal } from "@/components/note/recording/recording-name-modal";
import { CategoryButtons } from "@/components/note/layout/category-buttons";
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { FilePanel } from "@/components/note/panels/file-panel";
import { EtcPanel } from "@/components/note/panels/etc-panel";
import { TagsPanel } from "@/components/note/panels/tags-panel";

export function RightSidePanel() {
  const {
    files: uploadedFiles,
    addFile,
    removeFile,
    selectedFileId,
    selectFile,
    renameFile,
    copyFile,
    activeCategories,
    toggleCategory,
    isExpanded,
    isPlaying,
    togglePlay,
    currentTime,
    questions,
    addQuestion,
    deleteQuestion,
    addRecording,
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
  } = usePanelsStore();

  const { recordings, isExpanded: isRecordingExpanded, toggleExpanded: toggleRecordingExpanded } = useRecordingList();

  // 녹음 기능
  const {
    isRecording,
    isPaused,
    formattedTime: recordingTime,
    error: recordingError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  } = useRecording();

  // 녹음 이름 모달 상태
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [pendingRecordingData, setPendingRecordingData] = useState<RecordingData | null>(null);

  // 사용자 정보 (추후 useAuth로 대체)
  const currentUser = { name: "사용자", email: "user@example.com" };

  // 파일 추가 래퍼 함수 (File -> FileItem으로 변환)
  const handleAddFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const fileItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url,
      file,
    };
    addFile(fileItem);
  };

  // 질문 추가 핸들러
  const handleAddQuestion = (content: string, author: string) => {
    addQuestion(content, author);
    // 추후 백엔드 API 연동
  };

  // 녹음 재생/일시정지 토글
  const handlePlayToggle = () => {
    if (isRecording) {
      // 녹음 중이면 일시정지/재개
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      // 녹음 중이 아니면 녹음 시작
      startRecording();
    }
  };

  // 녹음 종료 (모달 열기)
  const handleStopRecording = async () => {
    try {
      const recordingData = await stopRecording();
      setPendingRecordingData(recordingData);
      setIsNameModalOpen(true);
    } catch (error) {
      console.error("녹음 종료 실패:", error);
      alert("녹음 저장에 실패했습니다");
    }
  };

  // 녹음 저장 (이름과 함께)
  const handleSaveRecording = (title: string) => {
    if (!pendingRecordingData) return;

    addRecording({
      title,
      duration: pendingRecordingData.duration,
      createdAt: pendingRecordingData.createdAt,
      audioBlob: pendingRecordingData.audioBlob,
    });

    setIsNameModalOpen(false);
    setPendingRecordingData(null);
  };

  // 녹음 저장 취소
  const handleCancelSave = () => {
    setIsNameModalOpen(false);
    setPendingRecordingData(null);
  };

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full flex flex-col gap-3 pt-6 px-6 bg-[#1e1e1e] transition-all duration-300 ${
        isExpanded ? 'translate-x-0 w-[424px]' : 'translate-x-full w-0'
      }`}
    >
      {isExpanded && (
        <>
          {/* 녹음바 */}
          <RecordingBar
            isPlaying={isRecording ? !isPaused : isPlaying}
            time={isRecording ? recordingTime : formatTime(currentTime)}
            onPlayToggle={handlePlayToggle}
            onStop={handleStopRecording}
            isExpanded={isRecordingExpanded}
            onToggleExpand={toggleRecordingExpanded}
            recordings={recordings}
            isScriptOpen={isScriptOpen}
            onToggleScript={toggleScript}
            isRecording={isRecording}
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
          <TagsPanel
            isOpen={isTagsPanelOpen}
          />

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

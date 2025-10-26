/**
 * 노트 우측 사이드 패널 - Client Component
 * 녹음바, 스크립트, 파일, etc, 태그 패널을 담당
 */

"use client";

import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useRecordingList } from "@/features/note/player";
import { RecordingBar } from "@/components/note/recording/recording-bar";
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
            isPlaying={isPlaying}
            time={formatTime(currentTime)}
            onPlayToggle={togglePlay}
            isExpanded={isRecordingExpanded}
            onToggleExpand={toggleRecordingExpanded}
            recordings={recordings}
            isScriptOpen={isScriptOpen}
            onToggleScript={toggleScript}
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

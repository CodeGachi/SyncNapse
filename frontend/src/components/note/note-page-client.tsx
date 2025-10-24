/**
 * 노트 페이지 클라이언트 컴포넌트
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useNoteEditorStore } from "@/stores";
import { useRecordingList } from "@/features/note/player";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useUpdateNote } from "@/lib/api/mutations/notes.mutations";
import { useAutoSave } from "@/hooks/use-auto-save";
import { NoteSidebar } from "@/components/note/note-sidebar";
import { FileTabs } from "@/components/note/file-tabs";
import { PdfViewer } from "@/components/note/pdf-viewer";
import { RecordingBar } from "@/components/note/recording-bar";
import { CategoryButtons } from "@/components/note/category-buttons";
import { SidebarIcons } from "@/components/note/sidebar-icons";
import { ScriptPanel } from "@/components/note/script-panel";
import { NotePanel } from "@/components/note/note-panel";
import { FilePanel } from "@/components/note/file-panel";
import { EtcPanel } from "@/components/note/etc-panel";
import { TagsPanel } from "@/components/note/tags-panel";
import { AutoSaveBadge } from "@/components/note/auto-save-badge";

interface NotePageClientProps {
  noteId: string | null;
  noteTitle: string | null;
}

export function NotePageClient({ noteId, noteTitle: initialTitle }: NotePageClientProps) {
  // TanStack Query - 노트 데이터 조회
  const { data: note, isLoading, error } = useNote(noteId);

  // TanStack Query - 노트 업데이트
  const updateNote = useUpdateNote();

  // 사용자 정보 (추후 useAuth로 대체)
  const currentUser = { name: "사용자", email: "user@example.com" };

  // Zustand Store - Note Editor State
  const {
    isNotePanelOpen,
    toggleNotePanel,
    blocks,
    addBlock,
    updateBlock,
    deleteBlock,
    isFilePanelOpen,
    toggleFilePanel,
    files: uploadedFiles,
    addFile,
    removeFile,
    selectedFileId,
    selectFile,
    loadFiles,
    renameFile,
    copyFile,
    isScriptOpen,
    toggleScript,
    activeTab,
    setActiveTab,
    activeCategories,
    toggleCategory,
    isExpanded,
    toggleExpand,
    isPlaying,
    togglePlay,
    currentTime,
    // 새 기능들
    questions,
    addQuestion,
    deleteQuestion,
    autoSaveStatus,
    lastSavedAt,
    isEtcPanelOpen,
    toggleEtcPanel,
    isTagsPanelOpen,
    toggleTagsPanel,
  } = useNoteEditorStore();

  // Recording list는 여전히 별도 hook 사용 (간단한 로컬 상태)
  const { recordings, isExpanded: isRecordingExpanded, toggleExpanded: toggleRecordingExpanded } = useRecordingList();

  // 자동저장 훅
  useAutoSave({
    noteId: noteId || "",
    enabled: !!noteId,
    onSave: async () => {
      if (!noteId) return;
      await updateNote.mutateAsync({
        noteId,
        updates: {
          // blocks를 업데이트 (실제로는 백엔드 API에 맞게 수정 필요)
          // 임시로 updatedAt만 업데이트
          updatedAt: new Date().toISOString(),
        },
      });
    },
  });

  // 탭 변경 시 파일도 선택
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (uploadedFiles[index]) {
      selectFile(uploadedFiles[index].id);
    }
  };

  // 탭 닫기 (파일 삭제)
  const handleTabClose = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    if (fileToRemove) {
      removeFile(fileToRemove.id);
    }
  };

  // 질문 추가 핸들러
  const handleAddQuestion = (content: string, author: string) => {
    addQuestion(content, author);
    // 추후 백엔드 API 연동
  };

  // TanStack Query로 받은 노트 데이터를 파일 패널에 로드
  useEffect(() => {
    if (note?.files && note.files.length > 0) {
      const fileItems = note.files.map((noteFile) => ({
        id: noteFile.id,
        name: noteFile.name,
        type: noteFile.type,
        size: noteFile.size,
        uploadedAt: note.createdAt,
        url: noteFile.url || "",
      }));
      loadFiles(fileItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-red-500 text-xl">노트를 불러오는데 실패했습니다.</div>
      </div>
    );
  }

  // 노트가 없는 경우
  if (!note) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-white text-xl">노트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const noteTitle = note.title || "제목 없음";

  // 업로드된 파일을 탭용 파일 형식으로 변환
  const files = uploadedFiles.map((file, index) => ({
    id: index + 1,
    name: file.name,
  }));

  // 선택된 파일 가져오기
  const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);

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

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* 좌측 사이드바 */}
      <NoteSidebar />

      {/* 메인 섹션 */}
      <main className={`flex-1 h-full flex gap-3 p-6 transition-all duration-300 ${isExpanded ? 'mr-[424px]' : ''}`}>
        {/* 필기/탭 영역 */}
        <div className="flex flex-col gap-3 flex-1">
          {/* 제목 영역 */}
          <div className="flex justify-between items-center px-2.5 min-h-[39px]">
            <div className="flex items-center gap-4">
              <h1 className="text-[32px] font-bold text-white leading-[39px]">
                {noteTitle}
              </h1>
              {/* 자동저장 배지 */}
              <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} />
            </div>

            {/* 사이드바 확장 버튼 */}
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
            <div className="flex-1 flex flex-col gap-0 overflow-hidden">
              {/* PDF 뷰어 - 상단 절반 */}
              <div className={`${isNotePanelOpen ? 'h-1/2' : 'h-full'} transition-all duration-300`}>
                <PdfViewer
                  fileUrl={selectedFile?.url}
                  fileName={selectedFile?.name}
                  fileType={selectedFile?.type}
                />
              </div>

              {/* 노트 패널 - 하단 절반 */}
              {isNotePanelOpen && (
                <div className="h-1/2 overflow-y-auto p-3 bg-[#1e1e1e]">
                  <NotePanel
                    isOpen={isNotePanelOpen}
                    blocks={blocks}
                    onAddBlock={addBlock}
                    onUpdateBlock={updateBlock}
                    onDeleteBlock={deleteBlock}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측 패널 - 확장/축소 가능 */}
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

        {/* 우측 사이드바 아이콘 (닫혀있을 때) */}
        <SidebarIcons isExpanded={isExpanded} onToggle={toggleExpand} />
      </main>
    </div>
  );
}

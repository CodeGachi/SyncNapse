/**
 * 노트 메인 콘텐츠 영역 - Client Component
 * 제목, 파일 탭, PDF 뷰어, 노트 패널을 담당
 */

"use client";

import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { FileTabs } from "@/components/note/viewer/file-tabs";
import { CustomPdfViewer } from "@/components/note/viewer/custom-pdf-viewer";
import { NotePanel } from "@/components/note/editor/note-panel";
import { AutoSaveBadge } from "@/components/note/editor/auto-save-badge";

interface NoteContentAreaProps {
  noteTitle: string;
}

export function NoteContentArea({ noteTitle }: NoteContentAreaProps) {
  const {
    files: uploadedFiles,
    removeFile,
    selectedFileId,
    selectFile,
    activeTab,
    setActiveTab,
    isExpanded,
    toggleExpand,
    autoSaveStatus,
    lastSavedAt,
  } = useNoteEditorStore();

  const { isNotePanelOpen } = usePanelsStore();

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

  // 업로드된 파일을 탭용 파일 형식으로 변환
  const files = uploadedFiles.map((file, index) => ({
    id: index + 1,
    name: file.name,
  }));

  // 선택된 파일 가져오기
  const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);

  return (
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
            <CustomPdfViewer
              fileUrl={selectedFile?.url}
              fileName={selectedFile?.name}
              fileType={selectedFile?.type}
            />
          </div>

          {/* 노트 패널 - 하단 절반 */}
          {isNotePanelOpen && (
            <div className="h-1/2 overflow-y-auto p-3 bg-[#1e1e1e]">
              <NotePanel isOpen={isNotePanelOpen} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

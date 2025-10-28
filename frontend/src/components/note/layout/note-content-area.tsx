/**
 * 노트 메인 콘텐츠 영역 - Client Component
 * 제목, 파일 탭, PDF 뷰어, 노트 패널을 담당
 */

"use client";

import { useState, useEffect, useRef } from "react";
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

  const [showExpandButton, setShowExpandButton] = useState(true);
  const [viewerHeight, setViewerHeight] = useState(60); // 뷰어 높이를 퍼센트로 관리
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 화면 크기 감지하여 확장 버튼 표시 여부 결정
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200;
      setShowExpandButton(window.innerWidth >= minWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 드래그 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;

      // 최소 30%, 최대 70%로 제한
      const clampedHeight = Math.max(30, Math.min(70, newHeight));
      setViewerHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // 열린 파일들 가져오기
  const openedFiles = getOpenedFiles();

  // 탭 변경 시 파일도 선택
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (openedFiles[index]) {
      selectFile(openedFiles[index].id);
    }
  };

  // 탭 닫기 (탭에서만 제거, 파일은 유지)
  const handleTabClose = (index: number) => {
    const fileToClose = openedFiles[index];
    if (fileToClose) {
      closeTab(fileToClose.id);
    }
  };

  // 탭용 파일 형식으로 변환
  const files = openedFiles.map((file, index) => ({
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

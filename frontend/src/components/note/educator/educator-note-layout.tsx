/**
 * Educator Note Layout
 * 
 * Layout structure:
 * - 강의자료 (PDF Viewer) - flex-1
 * - 오디오 목록 - h-[190px]
 * - 자막 섹션 - min-h-[200px] max-h-[400px]
 * - typing section (BlockNote) - flex-1
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useNoteEditorStore } from "@/stores";
import { CustomPdfViewer } from "@/components/note/viewer/custom-pdf-viewer";
import { FileTabs } from "@/components/note/viewer/file-tabs";
import { NotePanel } from "@/components/note/text-notes/note-panel";
import { PDFDrawingOverlay, type PDFDrawingOverlayHandle } from "@/components/note/drawing/pdf-drawing-overlay";
import { AudioList } from "./audio-list";
import { SubtitlePanel } from "./subtitle-panel";

interface EducatorNoteLayoutProps {
  noteId: string;
  noteTitle: string;
  isCollaborating?: boolean;
}

export function EducatorNoteLayout({
  noteId,
  noteTitle,
  isCollaborating = false,
}: EducatorNoteLayoutProps) {
  const { selectedFileId, currentPage, files, openedTabs, activeTab, setActiveTab, openFileInTab, closeTab } = useNoteEditorStore();
  
  // PDF rendering info for drawing overlay
  const [pdfRenderInfo, setPdfRenderInfo] = useState<{
    width: number;
    height: number;
    scale: number;
    pageNum: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);

  const drawingOverlayRef = useRef<PDFDrawingOverlayHandle>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
  // Drawing tool state
  const [currentTool, setCurrentTool] = useState("pen");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(2);

  // Selected audio for subtitle display
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);

  // Get opened files for tabs
  const openedFiles = files.filter(f => openedTabs.includes(f.id));

  // 초기 마운트 시에만 파일이 있는데 탭이 비어있으면 자동으로 첫 번째 파일 열기
  useEffect(() => {
    if (files.length > 0 && openedTabs.length === 0) {
      console.log('[EducatorNoteLayout] Auto-opening first file on mount:', files[0].id);
      openFileInTab(files[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]); // files.length만 의존성으로 추가 - 파일 개수가 변경될 때만 실행

  // Handle tab change
  const handleTabChange = (index: number) => {
    const fileId = openedTabs[index];
    if (fileId) {
      setActiveTab(index);
      openFileInTab(fileId);
    }
  };
  
  // Handle tab close
  const handleTabClose = (index: number) => {
    const fileId = openedTabs[index];
    if (fileId) {
      closeTab(fileId);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#1e1e1e]">
      {/* Left: Material Section (PDF + Audio + Subtitles) */}
      <div className="flex flex-col w-1/2 border-r border-gray-700">
        {/* PDF Viewer Section */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-[#2a2a2a]">
          <div className="w-full h-full flex flex-col">
            {/* File Tabs - 항상 표시 */}
            <FileTabs
              files={openedFiles.map(f => ({ id: parseInt(f.id), name: f.name }))}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onTabClose={handleTabClose}
            />

            {/* PDF Viewer with Drawing Overlay */}
            <div className="flex-1 relative">
              {selectedFileId ? (
                <>
                  <CustomPdfViewer
                    fileUrl={selectedFileId}
                    fileName={openedFiles.find(f => f.id === selectedFileId)?.name}
                    fileType="application/pdf"
                    onPageChange={setCurrentPdfPage}
                    onPdfRenderInfo={(info: {
                      width: number;
                      height: number;
                      scale: number;
                      pageNum: number;
                      baseWidth: number;
                      baseHeight: number;
                    }) => setPdfRenderInfo(info)}
                  />
                  
                  {isDrawingMode && pdfRenderInfo && (
                    <PDFDrawingOverlay
                      ref={drawingOverlayRef}
                      isEnabled={true}
                      isDrawingMode={isDrawingMode}
                      noteId={noteId}
                      fileId={selectedFileId}
                      pageNum={currentPdfPage}
                      containerWidth={pdfRenderInfo.baseWidth}
                      containerHeight={pdfRenderInfo.baseHeight}
                      pdfScale={pdfRenderInfo.scale}
                      currentTool={currentTool}
                      penColor={penColor}
                      penSize={penSize}
                      isPdf={true}
                      isCollaborative={isCollaborating}
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  강의 자료를 업로드해주세요
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio List Section */}
        <div className="w-full bg-[#363636] border-2 border-white rounded-[30px] transition-all duration-300 h-[190px] p-[10px] px-6 m-4">
          <AudioList 
            noteId={noteId} 
            onAudioSelect={setSelectedAudioId}
            selectedAudioId={selectedAudioId}
          />
        </div>

        {/* Subtitle Section */}
        <div className="bg-[#1e1e1e] rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto mx-4 mb-4">
          <SubtitlePanel 
            audioId={selectedAudioId}
            noteId={noteId}
          />
        </div>
      </div>

      {/* Right: Typing Section (BlockNote Editor) */}
      <div className="flex-1 overflow-y-auto blocknote-container bg-[#1e1e1e]">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">{noteTitle}</h1>
          <NotePanel isOpen={true} noteId={noteId} />
        </div>
      </div>
    </div>
  );
}


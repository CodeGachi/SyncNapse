/**
 * 노트 메인 콘텐츠 영역 - Client Component
 * 제목, 파일 탭, PDF 뷰어, 노트 패널을 담당
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useNoteEditorStore, usePanelsStore, useDrawStore, useToolsStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useNoteContentArea } from "@/features/note/note-structure/use-note-content-area";
import { FileTabs } from "@/components/note/viewer/file-tabs";
import { CustomPdfViewer } from "@/components/note/viewer/custom-pdf-viewer";
import { NotePanel } from "@/components/note/text-notes/note-panel"; // ✅ text-notes (텍스트 필기)
import { PDFDrawingOverlay, type PDFDrawingOverlayHandle } from "@/components/note/drawing/pdf-drawing-overlay"; // ✅ drawing (손필기)
import { DrawingSidebar } from "@/components/note/drawing/drawing-sidebar"; // ✅ drawing
import { saveDrawing } from "@/lib/db/drawings";

interface NoteContentAreaProps {
  noteId: string | null;
  noteTitle: string;
  isCollaborating?: boolean;
  isSharedView?: boolean; // 공유 링크로 접속한 경우
  isEducator?: boolean; // 교육자 노트 여부 (prop으로 명시적 전달)
  onStartCollaboration?: () => void;
  onStopCollaboration?: () => void;
}

export function NoteContentArea({
  noteId,
  noteTitle,
  isCollaborating,
  isSharedView = false,
  isEducator,
  onStartCollaboration,
  onStopCollaboration,
}: NoteContentAreaProps) {
  // 실제 노트 데이터로부터 제목 가져오기
  // 공유 모드에서는 로컬 DB 쿼리 비활성화 (Liveblocks Storage에서 가져옴)
  const { data: note } = useNote(noteId, { enabled: !isSharedView });
  const actualTitle = note?.title || noteTitle;
  // 교육자 노트 여부: prop으로 명시적 전달되면 절대 우선 (|| 연산자 사용)
  // isEducator={true}가 전달되면 DB의 type과 무관하게 educator로 처리
  const isEducatorNote = isEducator === true || note?.type === "educator";

  // 디버깅: isEducatorNote 값 추적
  useEffect(() => {
    console.log('[NoteContentArea] 렌더링 체크:', {
      isEducator,
      noteType: note?.type,
      isEducatorNote,
      noteId,
    });
  }, [isEducator, note?.type, isEducatorNote, noteId]);

  // PDF 컨테이너 크기 추적
  const [pdfContainerSize, setPdfContainerSize] = useState({ width: 0, height: 0 });
  const pdfViewerContainerRef = useRef<HTMLDivElement>(null);

  // PDF 실제 렌더링 크기 추적 (드로잉 캔버스 동기화용)
  const [pdfRenderInfo, setPdfRenderInfo] = useState<{
    width: number;
    height: number;
    scale: number;
    pageNum: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);

  // 필기 오버레이 ref (undo/redo/clear 함수 호출용)
  const drawingOverlayRef = useRef<PDFDrawingOverlayHandle>(null);

  // PDF 현재 페이지 추적
  const [currentPdfPage, setCurrentPdfPage] = useState(1);

  // 필기 모드 상태 (필기/뷰어)
  const [isDrawingMode, setIsDrawingMode] = useState(true);

  // Zustand 스토어에서 필기 도구 상태 가져오기
  const drawStore = useDrawStore();
  const toolsStore = useToolsStore();

  // 현재 도구 타입
  const currentTool = drawStore.type;
  const penColor = drawStore.lineColor;
  const penSize = drawStore.lineWidth;

  // Undo/Redo 상태 업데이트 - useEffect로 처리
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Store states
  const editorStore = useNoteEditorStore();
  const panelsStore = usePanelsStore();
  
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
  } = editorStore;

  const { isNotePanelOpen } = panelsStore;

  // 열린 파일들 가져오기
  const openedFiles = getOpenedFiles();

  const noteContentAreaHook = useNoteContentArea({
    openedFiles,
    setActiveTab,
    selectFile,
    closeTab,
  });

  const {
    viewerHeight,
    isDragging,
    containerRef,
    setIsDragging,
    handleTabChange,
    handleTabClose,
    convertFilesForTabs,
  } = noteContentAreaHook;

  useEffect(() => {
    setCanUndo(toolsStore.getCanUndo());
    setCanRedo(toolsStore.getCanRedo());
  }, [toolsStore]);

  // 초기 마운트 시에만 파일이 있는데 탭이 비어있으면 자동으로 첫 번째 파일 열기
  useEffect(() => {
    if (uploadedFiles.length > 0 && openedTabs.length === 0) {
      console.log('[NoteContentArea] Auto-opening first file on mount:', uploadedFiles[0].id);
      const openFileInTab = editorStore.openFileInTab;
      openFileInTab(uploadedFiles[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles.length]); // uploadedFiles.length만 의존성으로 추가 - 파일 개수가 변경될 때만 실행

  // PDF 컨테이너 크기 변화 감지
  useEffect(() => {
    const container = pdfViewerContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setPdfContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });

    resizeObserver.observe(container);

    // 초기 크기 설정
    setPdfContainerSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 탭용 파일 형식으로 변환
  const files = convertFilesForTabs();

  // 선택된 파일 가져오기
  const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* 제목 영역 제거 - NoteHeader로 이동 */}

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
          {/* PDF 뷰어와 필기 사이드바를 가로로 배치 */}
          <div
            ref={pdfViewerContainerRef}
            className="flex-1 flex flex-row gap-4 transition-all duration-300"
            style={{
              height: isNotePanelOpen ? `${viewerHeight}%` : 'auto',
              overflow: 'visible',
            }}
          >
            {/* PDF 뷰어 - 왼쪽 (필기 오버레이 포함) */}
            <div
              className="relative overflow-hidden"
              style={{
                flex: 1,
              }}
            >
              {/* PDF 뷰어 */}
              <div className="absolute inset-0 overflow-auto">
                <CustomPdfViewer
                  fileUrl={selectedFile?.url}
                  fileName={selectedFile?.name}
                  fileType={selectedFile?.type}
                  onPageChange={setCurrentPdfPage}
                  onPdfRenderInfo={setPdfRenderInfo}
                />
              </div>

              {/* 필기 오버레이 (교육자 노트) - PDF 뷰어 위에 오버레이 */}
              {isEducatorNote && selectedFile && pdfRenderInfo && (() => {
                // PDF Debug logs disabled for performance

                return (
                  <PDFDrawingOverlay
                    ref={drawingOverlayRef}
                    isEnabled={true}
                    isDrawingMode={isDrawingMode}
                    isCollaborative={isCollaborating ?? false}
                    noteId={noteId || ""}
                    fileId={selectedFile.id.toString()}
                    pageNum={currentPdfPage}
                    containerWidth={pdfRenderInfo.baseWidth}
                    containerHeight={pdfRenderInfo.baseHeight}
                    pdfScale={pdfRenderInfo.scale}
                    currentTool={currentTool}
                    penColor={penColor}
                    penSize={penSize}
                    isPdf={selectedFile.type?.includes("pdf")}
                    onSave={async (data) => {
                      try {
                        await saveDrawing(data);
                        console.log(`Drawing saved for file ${selectedFile.id} page ${currentPdfPage}:`, data.id);
                      } catch (error) {
                        console.error("Failed to save drawing:", error);
                      }
                    }}
                  />
                );

              })()}
            </div>

            {/* 필기 도구 사이드바 - 우측 (교육자 노트만 표시) */}
            {isEducatorNote && (
              <DrawingSidebar
                isEnabled={true}
                isDrawingMode={isDrawingMode}
                currentTool={{
                  type: currentTool,
                  color: penColor,
                  strokeWidth: penSize,
                  opacity: currentTool === "highlighter" ? 0.3 : 1,
                }}
                penColor={penColor}
                penSize={penSize}
                canUndo={canUndo}
                canRedo={canRedo}
                onDrawingModeChange={setIsDrawingMode}
                onToolChange={(tool: string) => drawStore.setDrawType(tool as any)}
                onColorChange={(color) => drawStore.setLineColor(color)}
                onSizeChange={(size) => drawStore.setLineWidth(size)}
                onUndo={() => drawingOverlayRef.current?.handleUndo()}
                onRedo={() => drawingOverlayRef.current?.handleRedo()}
                onClear={() => drawingOverlayRef.current?.handleClear()}
              />
            )}
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
              <NotePanel isOpen={isNotePanelOpen} noteId={noteId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

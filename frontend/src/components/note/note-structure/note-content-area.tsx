/**
 * 노트 메인 콘텐츠 영역
 *
 * 파일 탭, PDF 뷰어, 노트 패널을 담당하는 Client Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useNoteContentArea } from "@/features/note/note-structure/use-note-content-area";
import { useDrawingSave } from "@/features/note/drawing";
import { FileTabs } from "@/components/note/viewer/file-tabs";
import { CustomPdfViewer } from "@/components/note/viewer/custom-pdf-viewer";
import { NotePanel } from "@/components/note/panels/note-panel";
import { type PDFDrawingOverlayHandle } from "@/components/note/drawing/pdf-drawing-overlay";
import { DrawingSidebar } from "@/components/note/drawing/drawing-sidebar";
import { createLogger } from "@/lib/utils/logger";
import { motion } from "framer-motion";

const log = createLogger("NoteContentArea");

interface NoteContentAreaProps {
  noteId: string | null;
  noteTitle: string;
  isCollaborating?: boolean;
  isSharedView?: boolean;
  isEducator?: boolean;
}

export function NoteContentArea({
  noteId,
  noteTitle,
  isCollaborating,
  isSharedView = false,
  isEducator,
}: NoteContentAreaProps) {
  // 공유 모드에서는 로컬 DB 쿼리 비활성화 (Liveblocks Storage에서 가져옴)
  const { data: note } = useNote(noteId, { enabled: !isSharedView });
  // 교육자 노트 여부: prop으로 명시적 전달되면 절대 우선
  const isEducatorNote = isEducator === true || note?.type === "educator";

  // 디버깅 로그
  useEffect(() => {
    log.debug("렌더링 체크:", {
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

  // 필기 모드 상태 (필기/뷰어) - 기본값: 뷰어 모드 (PDF 조작 가능)
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Store states
  const editorStore = useNoteEditorStore();
  const panelsStore = usePanelsStore();

  const {
    files: uploadedFiles,
    openedTabs,
    selectedFileId,
    selectFile,
    activeTab,
    setActiveTab,
    closeTab,
    getOpenedFiles,
  } = editorStore;

  const { isNotePanelOpen, isDrawingSidebarOpen } = panelsStore;

  // 열린 파일들 가져오기
  const openedFiles = getOpenedFiles();

  // 선택된 파일 가져오기
  const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);

  // 드로잉 저장 훅
  const { handleDrawingSave } = useDrawingSave({
    fileId: selectedFile?.id.toString(),
    pageNum: currentPdfPage,
  });

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

  // 초기 마운트 시에만 파일이 있는데 탭이 비어있으면 자동으로 첫 번째 파일 열기
  useEffect(() => {
    if (uploadedFiles.length > 0 && openedTabs.length === 0) {
      log.debug("마운트 시 첫 번째 파일 자동 열기:", uploadedFiles[0].id);
      const openFileInTab = editorStore.openFileInTab;
      openFileInTab(uploadedFiles[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles.length]);

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

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-3 flex-1"
    >
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
              height: isNotePanelOpen ? `${viewerHeight}%` : "auto",
              overflow: "visible",
            }}
          >
            {/* PDF 뷰어 - 왼쪽 (필기 오버레이 포함) */}
            <div
              className="relative overflow-hidden"
              style={{
                flex: 1,
              }}
            >
              {/* PDF 뷰어 + Drawing 오버레이 (CustomPdfViewer 내부에서 렌더링) */}
              <div className="absolute inset-0 overflow-auto">
                <CustomPdfViewer
                  fileUrl={selectedFile?.url}
                  fileName={selectedFile?.name}
                  fileType={selectedFile?.type}
                  onPageChange={setCurrentPdfPage}
                  onPdfRenderInfo={setPdfRenderInfo}
                  // Drawing overlay props
                  drawingEnabled={!!selectedFile}
                  drawingMode={isDrawingMode}
                  drawingOverlayRef={drawingOverlayRef}
                  noteId={noteId || ""}
                  fileId={selectedFile?.id.toString()}
                  isCollaborative={isCollaborating ?? false}
                  isSharedView={isSharedView ?? false}
                  onDrawingSave={handleDrawingSave}
                />
              </div>
            </div>

            {/* 필기 도구 사이드바 - 우측 (파일 선택 + 필기바 표시 시만 표시) */}
            {selectedFile && isDrawingSidebarOpen && (
              <DrawingSidebar
                isEnabled={true}
                isDrawingMode={isDrawingMode}
                onDrawingModeChange={setIsDrawingMode}
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
              className="h-1 bg-border hover:bg-border-strong cursor-ns-resize transition-colors relative group"
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 flex items-center justify-center">
                <div className="w-12 h-1 bg-border-strong rounded-full group-hover:bg-foreground transition-colors" />
              </div>
            </div>
          )}

          {/* 노트 패널 - 하단 */}
          {isNotePanelOpen && (
            <div
              className="overflow-y-auto bg-background-surface"
              style={{
                height: `${100 - viewerHeight}%`,
                marginRight:
                  selectedFile && isDrawingSidebarOpen
                    ? "72px" // 필기바 표시: 56px + gap 16px
                    : "0",
              }}
            >
              <NotePanel isOpen={isNotePanelOpen} noteId={noteId} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

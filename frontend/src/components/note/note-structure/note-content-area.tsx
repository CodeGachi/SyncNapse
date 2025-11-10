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
import { AutoSaveBadge } from "@/components/note/text-notes/auto-save-badge"; // ✅ text-notes
import { SharingSettingsModal } from "@/components/note/shared/sharing-settings-modal";
import { PDFDrawingOverlay, type PDFDrawingOverlayHandle } from "@/components/note/drawing/pdf-drawing-overlay"; // ✅ drawing (손필기)
import { DrawingSidebar } from "@/components/note/drawing/drawing-sidebar"; // ✅ drawing
import { saveDrawing } from "@/lib/db/drawings";

interface NoteContentAreaProps {
  noteId: string | null;
  noteTitle: string;
  isCollaborating?: boolean;
  isSharedView?: boolean; // 공유 링크로 접속한 경우
  onStartCollaboration?: () => void;
  onStopCollaboration?: () => void;
}

export function NoteContentArea({
  noteId,
  noteTitle,
  isCollaborating,
  isSharedView = false,
  onStartCollaboration,
  onStopCollaboration,
}: NoteContentAreaProps) {
  // 실제 노트 데이터로부터 제목 가져오기
  // 공유 모드에서는 로컬 DB 쿼리 비활성화 (Liveblocks Storage에서 가져옴)
  const { data: note } = useNote(noteId, { enabled: !isSharedView });
  const actualTitle = note?.title || noteTitle;
  const isEducatorNote = note?.type === "educator";

  // 공유 설정 관리
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [sharingSettings, setSharingSettings] = useState(
    note?.accessControl || {
      isPublic: false,
      allowedUsers: [],
      allowComments: true,
      realTimeInteraction: true,
    }
  );
  const [newUserEmail, setNewUserEmail] = useState("");

  // PDF 컨테이너 크기 추적
  const [pdfContainerSize, setPdfContainerSize] = useState({ width: 0, height: 0 });
  const pdfViewerContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setCanUndo(toolsStore.getCanUndo());
    setCanRedo(toolsStore.getCanRedo());
  }, [toolsStore]);

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

  const togglePublic = () => {
    setSharingSettings((prev) => ({
      ...prev,
      isPublic: !prev.isPublic,
    }));
  };

  const addUser = (email: string) => {
    if (!email || !email.includes("@")) return;
    const updatedUsers = [...(sharingSettings.allowedUsers || [])];
    if (!updatedUsers.includes(email)) {
      updatedUsers.push(email);
      setSharingSettings((prev) => ({
        ...prev,
        allowedUsers: updatedUsers,
      }));
      setNewUserEmail("");
    }
  };

  const removeUser = (email: string) => {
    setSharingSettings((prev) => ({
      ...prev,
      allowedUsers: (prev.allowedUsers || []).filter((u) => u !== email),
    }));
  };

  const toggleComments = () => {
    setSharingSettings((prev) => ({
      ...prev,
      allowComments: !prev.allowComments,
    }));
  };

  const toggleRealTimeInteraction = () => {
    setSharingSettings((prev) => ({
      ...prev,
      realTimeInteraction: !prev.realTimeInteraction,
    }));
  };

  const copyShareLink = async () => {
    if (!sharingSettings.shareLink) {
      // 토큰 형식: {noteId}-{timestamp}-{randomString}
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const token = `${noteId}-${timestamp}-${randomString}`;
      const shareLink = `${window.location.origin}/shared/${token}`;

      setSharingSettings((prev) => ({
        ...prev,
        shareLink,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
      }));
    }
    if (sharingSettings.shareLink) {
      try {
        await navigator.clipboard.writeText(sharingSettings.shareLink);
        console.log("공유 링크가 복사되었습니다:", sharingSettings.shareLink);
      } catch (error) {
        console.error("링크 복사 실패:", error);
      }
    }
  };

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

  // 열린 파일들 가져오기
  const openedFiles = getOpenedFiles();

  const {
    showExpandButton,
    viewerHeight,
    isDragging,
    containerRef,
    setIsDragging,
    handleTabChange,
    handleTabClose,
    convertFilesForTabs,
  } = useNoteContentArea({
    openedFiles,
    setActiveTab,
    selectFile,
    closeTab,
  });

  // 탭용 파일 형식으로 변환
  const files = convertFilesForTabs();

  // 선택된 파일 가져오기
  const selectedFile = uploadedFiles.find((file) => file.id === selectedFileId);

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* 제목 영역 */}
      <div className="flex justify-between items-center px-2.5 min-h-[39px]">
        <div className="flex items-center gap-4">
          <h1 className="text-[32px] font-bold text-white leading-[39px]">
            {actualTitle}
          </h1>

          {/* 자동저장 배지 */}
          <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} />

          {/* 강의 노트 버튼들 (Educator만, 공유 모드 제외) */}
          {isEducatorNote && !isSharedView && (
            <div className="flex items-center gap-2">
              {/* 공유 설정 버튼 (아이콘만) */}
              <button
                onClick={() => setIsSharingOpen(!isSharingOpen)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#AFC02B] transition-colors cursor-pointer"
                title="공유 설정"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>

              {/* 공유 설정 모달 */}
              <SharingSettingsModal
                isOpen={isSharingOpen}
                onClose={() => setIsSharingOpen(false)}
                settings={sharingSettings}
                newUserEmail={newUserEmail}
                onNewUserEmailChange={setNewUserEmail}
                onAddUser={addUser}
                onRemoveUser={removeUser}
                onTogglePublic={togglePublic}
                onToggleComments={toggleComments}
                onToggleRealTimeInteraction={toggleRealTimeInteraction}
                onCopyShareLink={copyShareLink}
                shareLink={sharingSettings.shareLink}
                noteId={noteId || ""}
                noteTitle={actualTitle}
                isCollaborating={isCollaborating ?? false}
                onStartCollaboration={onStartCollaboration ?? (() => {})}
                onStopCollaboration={onStopCollaboration ?? (() => {})}
              />
            </div>
          )}

          {/* 공유 모드 뱃지 표시 */}
          {isSharedView && (
            <div className="px-3 py-1 bg-[#AFC02B]/20 text-[#AFC02B] rounded-full text-sm font-medium">
              공유 노트 보기
            </div>
          )}
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
          {/* PDF 뷰어와 필기 사이드바를 가로로 배치 */}
          <div
            ref={pdfViewerContainerRef}
            className="flex-1 flex flex-row overflow-hidden transition-all duration-300"
            style={{
              height: isNotePanelOpen ? `${viewerHeight}%` : 'auto',
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
                />
              </div>

              {/* 필기 오버레이 (교육자 노트) - PDF 뷰어 위에 오버레이 */}
              {isEducatorNote && selectedFile && (
                <PDFDrawingOverlay
                  ref={drawingOverlayRef}
                  isEnabled={true}
                  isDrawingMode={isDrawingMode}
                  noteId={noteId || ""}
                  fileId={selectedFile.id.toString()}
                  pageNum={currentPdfPage}
                  containerWidth={Math.max((pdfContainerSize.width || 800) - (isExpanded ? 500 : 0) - 80, 100)}
                  containerHeight={pdfContainerSize.height || 600}
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
              )}
            </div>

            {/* 필기 도구 사이드바 - 우측 */}
            {isEducatorNote && selectedFile && (
              <DrawingSidebar
                isEnabled={selectedFile.type?.includes("pdf") || false}
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

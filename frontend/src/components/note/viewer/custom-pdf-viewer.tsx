/**
 * 커스텀 PDF 뷰어 컴포넌트
 * pdfjs-dist를 직접 사용하여 canvas 렌더링
 * 노트 페이지와 PDF 페이지 동기화
 *
 * Refactored: Business logic separated to features/note/viewer/
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  usePdfLoader,
  usePdfControls,
  usePdfThumbnails,
  usePdfTextLayer,
  usePdfSearch,
} from "@/features/note/viewer";
import { useNoteKeyboard } from "@/features/note/keyboard";
import { usePanelsStore, useDrawStore, useNoteUIStore } from "@/stores";
import { PdfThumbnailSidebar } from "./pdf-thumbnail-sidebar";
import { PDFDrawingOverlay, type PDFDrawingOverlayHandle } from "@/components/note/drawing/pdf-drawing-overlay";
import type { DrawingData } from "@/lib/types/drawing";
import { LoadingScreen } from "@/components/common/loading-screen";
import { CursorOverlay } from "@/components/note/collaboration/cursor-overlay";
import { useCursorBroadcast } from "@/features/note/collaboration";

interface CustomPdfViewerProps {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  onPageChange?: (pageNum: number) => void;
  onPdfRenderInfo?: (info: {
    width: number;           // 현재 렌더링 크기
    height: number;
    scale: number;           // 현재 스케일
    pageNum: number;
    baseWidth: number;       // 원본 크기 (scale=1.0 기준)
    baseHeight: number;
  }) => void;
  // Drawing overlay props
  drawingEnabled?: boolean;
  drawingMode?: boolean;
  drawingOverlayRef?: React.RefObject<PDFDrawingOverlayHandle>;
  noteId?: string;
  fileId?: string;
  isCollaborative?: boolean;
  isSharedView?: boolean;    // 공유 뷰 모드 (학생용 - 읽기 전용)
  onDrawingSave?: (data: DrawingData) => Promise<void>;
}

export function CustomPdfViewer({
  fileUrl,
  fileName,
  fileType,
  onPageChange,
  onPdfRenderInfo,
  // Drawing overlay props
  drawingEnabled = false,
  drawingMode = false,
  drawingOverlayRef,
  noteId,
  fileId,
  isCollaborative = false,
  isSharedView = false,
  onDrawingSave,
}: CustomPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  // 썸네일 사이드바 토글 상태
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(true);

  // 마우스 팬 모드 (이동 모드) 토글 상태
  const [isPanModeEnabled, setIsPanModeEnabled] = useState(false);

  // Drawing overlay를 위한 PDF 렌더링 정보 (내부 상태)
  const [pdfRenderState, setPdfRenderState] = useState<{
    baseWidth: number;
    baseHeight: number;
    finalScale: number;
    // PDF 캔버스의 실제 렌더링 크기 (CSS 크기)
    renderedWidth: number;
    renderedHeight: number;
  } | null>(null);

  // Custom hooks for business logic
  const { pdfDoc, numPages, loading, error, isPdf, isImage } = usePdfLoader(
    fileUrl,
    fileType
  );

  const {
    scale,
    setScale,
    rotation,
    currentPage,
    setCurrentPage,
    handlePrevPage,
    handleNextPage,
    handlePageInput,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleRotateLeft,
    handleRotateRight,
  } = usePdfControls(numPages);

  // PDF Pan (UI 상태만 관리)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      x: containerRef.current.scrollLeft,
      y: containerRef.current.scrollTop,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    containerRef.current.scrollLeft = scrollStart.x - dx;
    containerRef.current.scrollTop = scrollStart.y - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // 썸네일 생성
  const { thumbnails } = usePdfThumbnails({
    pdfDoc,
    numPages,
    currentPage,
  });

  // Text layer for text selection
  usePdfTextLayer({
    pdfDoc,
    currentPage,
    scale,
    rotation,
    textLayerRef,
    canvasRef,
    containerRef,
  });

  // Search functionality
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    matches,
    currentMatchIndex,
    isSearching,
    goToNextMatch,
    goToPrevMatch,
    closeSearch,
  } = usePdfSearch({
    pdfDoc,
    numPages,
    currentPage,
    setCurrentPage,
    textLayerRef,
    isPdf,
  });

  // 패널 토글 함수들 및 상태 가져오기
  const {
    toggleNotePanel,
    toggleScript,
    toggleFilePanel,
    toggleDrawingSidebar,
    toggleChatbotPanel,
    toggleCollaborationPanel,
    isScriptOpen,
    isFilePanelOpen,
    isChatbotPanelOpen,
    isCollaborationPanelOpen,
  } = usePanelsStore();

  // 사이드바 확장 상태
  const { isExpanded, toggleExpand } = useNoteUIStore();

  // 필기 도구 상태
  const { setDrawType } = useDrawStore();

  // 통합 키보드 단축키
  useNoteKeyboard({
    // PDF 관련
    isPdf,
    numPages,
    currentPage,
    setCurrentPage,
    setScale,
    // 검색 관련
    isSearchOpen,
    setIsSearchOpen,
    closeSearch,
    // 썸네일/팬 모드
    isThumbnailOpen,
    setIsThumbnailOpen,
    isPanModeEnabled,
    setIsPanModeEnabled,
    // 패널 토글
    toggleNotePanel,
    toggleScriptPanel: toggleScript,
    toggleFilePanel,
    toggleDrawingSidebar,
    toggleChatbotPanel,
    toggleCollaborationPanel,
    // 사이드바 확장
    isExpanded,
    toggleExpand,
    // 개별 패널 상태 (사이드바 자동 확장용)
    isScriptOpen,
    isFilePanelOpen,
    isChatbotPanelOpen,
    isCollaborationPanelOpen,
    // 필기 도구
    isDrawingEnabled: drawingEnabled && drawingMode,
    setDrawingTool: setDrawType,
    onUndo: drawingOverlayRef?.current?.handleUndo,
    onRedo: drawingOverlayRef?.current?.handleRedo,
  });

  // 협업 모드일 때 커서 위치 브로드캐스트
  useCursorBroadcast(
    pdfWrapperRef,
    drawingMode,
    isCollaborative && isPdf
  );

  // 썸네일 클릭 핸들러
  const handleThumbnailClick = (pageNum: number) => {
    setCurrentPage(pageNum);
  };

  // 썸네일 토글 핸들러
  const handleThumbnailToggle = () => {
    setIsThumbnailOpen(prev => !prev);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!isPdf || !e.ctrlKey) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(10, prev + delta)));
  };

  // PDF 페이지 렌더링
  useEffect(() => {
    if (
      !pdfDoc ||
      !canvasRef.current ||
      !containerRef.current ||
      currentPage < 1 ||
      currentPage > numPages
    )
      return;

    let renderTask: any = null;
    let isUnmounted = false;

    const renderPage = async () => {
      if (isUnmounted) return;
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Cancel previous render if exists
        if (renderTask) {
          renderTask.cancel();
        }

        // 컨테이너 크기 계산
        const containerWidth = container.clientWidth - 16;
        const containerHeight = container.clientHeight - 16;

        // 스케일 계산 - 기본 피팅 스케일 + 사용자 줌
        const viewport = page.getViewport({ scale: 1, rotation });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const fitScale = Math.min(scaleX, scaleY);

        // scale 1.0 = 피팅 크기, 그 이상은 확대, 그 이하는 축소
        const finalScale = fitScale * scale;

        // 렌더링 - 캔버스 크기를 정확하게 설정
        const scaledViewport = page.getViewport({ scale: finalScale, rotation });

        // High DPI 디스플레이 지원
        const dpr = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * dpr;
        canvas.height = scaledViewport.height * dpr;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;

        // Context scale for high DPI
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;

        // 원본 크기 계산 (scale=1.0, rotation=0 기준)
        const baseViewport = page.getViewport({ scale: 1, rotation: 0 });

        // Drawing overlay를 위한 내부 상태 업데이트
        setPdfRenderState({
          baseWidth: baseViewport.width,
          baseHeight: baseViewport.height,
          finalScale,
          renderedWidth: scaledViewport.width,
          renderedHeight: scaledViewport.height,
        });

        // PDF 렌더링 정보 전달 (외부 콜백)
        if (onPdfRenderInfo) {
          onPdfRenderInfo({
            width: scaledViewport.width,
            height: scaledViewport.height,
            scale: finalScale,
            pageNum: currentPage,
            baseWidth: baseViewport.width,
            baseHeight: baseViewport.height,
          });
        }
      } catch (err) {
        // 페이지 렌더링 실패 (무시)
      }
    };

    // Initial render
    renderPage();

    // ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (!isUnmounted) {
        renderPage();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup function
    return () => {
      isUnmounted = true;
      if (renderTask) {
        renderTask.cancel();
      }
      resizeObserver.disconnect();
    };
  }, [pdfDoc, currentPage, scale, rotation, numPages, onPdfRenderInfo]);

  // 페이지 변경 시 콜백 호출
  useEffect(() => {
    if (onPageChange && isPdf) {
      onPageChange(currentPage);
    }
  }, [currentPage, isPdf, onPageChange]);

  // 검색창 열릴 때 input 포커스
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // 검색 키보드 핸들러
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    }
  };

  return (
    <div className="w-full h-full bg-background-elevated border-x border-b border-border rounded-bl-[15px] rounded-br-[15px] flex flex-col overflow-hidden relative">
      {/* 검색창 */}
      {isSearchOpen && isPdf && (
        <div className="absolute top-2 right-2 z-50 bg-background-elevated border border-border rounded-lg shadow-lg p-2 flex items-center gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="검색..."
            className="w-48 h-8 bg-background-surface border border-border rounded px-3 text-foreground text-sm focus:outline-none focus:border-border-hover"
          />
          <span className="text-foreground-tertiary text-xs min-w-[60px] text-center">
            {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : isSearching ? "검색 중..." : "0/0"}
          </span>
          <button
            onClick={goToPrevMatch}
            disabled={matches.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="이전 (Shift+Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 14L10 6M10 6L6 10M10 6L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />
            </svg>
          </button>
          <button
            onClick={goToNextMatch}
            disabled={matches.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="다음 (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 6L10 14M10 14L14 10M10 14L6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />
            </svg>
          </button>
          <button
            onClick={closeSearch}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay transition-colors"
            title="닫기 (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground" />
            </svg>
          </button>
        </div>
      )}

      {/* 메인 영역: 썸네일 사이드바 + PDF 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 썸네일 사이드바 (PDF일 때만) */}
        {isPdf && fileUrl && numPages > 0 && (
          <PdfThumbnailSidebar
            thumbnails={thumbnails}
            numPages={numPages}
            currentPage={currentPage}
            onPageClick={handleThumbnailClick}
            isOpen={isThumbnailOpen}
            onToggle={handleThumbnailToggle}
          />
        )}

        {/* 콘텐츠 영역 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-background-elevated"
          onMouseDown={isPanModeEnabled && !drawingMode ? handleMouseDown : undefined}
          onMouseMove={isPanModeEnabled && !drawingMode ? handleMouseMove : undefined}
          onMouseUp={isPanModeEnabled && !drawingMode ? handleMouseUp : undefined}
          onMouseLeave={isPanModeEnabled && !drawingMode ? handleMouseLeave : undefined}
          onWheel={handleWheel}
          style={{
            cursor: drawingMode ? "default" : (isPanModeEnabled ? (isPanning ? "grabbing" : "grab") : "default"),
            // 외부 영역은 항상 선택 불가, 텍스트 레이어만 선택 가능
            userSelect: "none",
          }}
        >
          {/* 중앙 정렬을 위한 내부 컨테이너 - 확대 시 좌우 스크롤 가능 */}
          <div
            className="inline-flex items-center justify-center p-4"
            style={{
              pointerEvents: isPanModeEnabled ? "none" : "auto",
              minWidth: "100%",
              minHeight: "100%",
            }}
          >
            {!fileUrl ? (
              <div className="flex flex-col items-center justify-center text-foreground-tertiary gap-3">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M38 8H14v48h36V22L38 8z" />
                  <path d="M38 8v14h12" />
                  <path d="M20 30h24M20 38h24M20 46h16" />
                </svg>
                <p className="text-sm">파일을 업로드하면 여기에 표시됩니다</p>
              </div>
            ) : isPdf ? (
              // PDF 파일
              <>
                {loading && (
                  <LoadingScreen message="PDF 로딩 중..." />
                )}

                {error && (
                  <div className="flex flex-col items-center gap-3 text-red-400">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 64 64"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="32" cy="32" r="28" />
                      <path d="M32 20v16M32 44h.01" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div
                  ref={pdfWrapperRef}
                  className="inline-block relative"
                  style={{ overflow: "hidden", contain: "paint" }}
                >
                  {/* PDF Canvas */}
                  <canvas
                    ref={canvasRef}
                    className={loading || error ? "hidden" : ""}
                    style={{
                      display: loading || error ? "none" : "block",
                      imageRendering: scale > 1.5 ? "auto" : "crisp-edges",
                    }}
                  />

                  {/* Text Layer - 텍스트 선택 가능하게 (팬 모드 off일 때 또는 검색 중일 때) */}
                  {/* drawingEnabled && drawingMode일 때만 숨김 (개인 노트에서는 drawingEnabled=false이므로 항상 표시) */}
                  <div
                    ref={textLayerRef}
                    className="textLayer"
                    style={{
                      display: loading || error || (drawingEnabled && drawingMode) ? "none" : "block",
                      pointerEvents: isPanModeEnabled ? "none" : "auto",
                      visibility: isPanModeEnabled && !isSearchOpen ? "hidden" : "visible",
                      // 텍스트 레이어만 선택 가능
                      userSelect: isPanModeEnabled ? "none" : "text",
                    }}
                  />

                  {/* Drawing Overlay - PDF Canvas와 정확히 같은 위치/크기 */}
                  {drawingEnabled && pdfRenderState && noteId && fileId && (
                    <PDFDrawingOverlay
                      ref={drawingOverlayRef}
                      isEnabled={true}
                      isDrawingMode={drawingMode}
                      isCollaborative={isCollaborative}
                      isSharedView={isSharedView}
                      noteId={noteId}
                      fileId={fileId}
                      pageNum={currentPage}
                      containerWidth={pdfRenderState.baseWidth}
                      containerHeight={pdfRenderState.baseHeight}
                      pdfScale={pdfRenderState.finalScale}
                      renderedWidth={pdfRenderState.renderedWidth}
                      renderedHeight={pdfRenderState.renderedHeight}
                      isPdf={isPdf}
                      onSave={onDrawingSave}
                    />
                  )}

                  {/* Cursor Overlay - 협업 모드에서 다른 사용자 커서 표시 */}
                  {isCollaborative && pdfRenderState && (
                    <CursorOverlay
                      width={pdfRenderState.renderedWidth}
                      height={pdfRenderState.renderedHeight}
                      educatorOnly={isSharedView}
                    />
                  )}
                </div>
              </>
            ) : isImage ? (
              // 이미지 파일
              <div className="w-full h-full p-4 overflow-auto flex items-center justify-center">
                <Image
                  src={fileUrl}
                  alt={fileName || "Image"}
                  width={800}
                  height={600}
                  className="max-w-full max-h-full object-contain"
                  unoptimized
                />
              </div>
            ) : (
              // 기타 파일
              <div className="flex flex-col items-center justify-center text-foreground-tertiary gap-3">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M38 8H14v48h36V22L38 8z" />
                  <path d="M38 8v14h12" />
                </svg>
                <p className="text-sm">{fileName}</p>
                <p className="text-xs text-foreground-tertiary">
                  이 파일 형식은 미리보기를 지원하지 않습니다
                </p>
                <a
                  href={fileUrl}
                  download={fileName}
                  className="px-4 py-2 bg-background-overlay hover:bg-background-base text-foreground rounded-lg text-sm transition-colors"
                >
                  다운로드
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF 컨트롤 바 */}
      {isPdf && fileUrl && numPages > 0 && (
        <div className="flex-shrink-0 h-11 bg-background-elevated border-t border-border flex items-center justify-between px-3 gap-3">
          {/* 페이지 네비게이션 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="이전 페이지"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12 4L6 10L12 16"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={currentPage}
                onChange={handlePageInput}
                min={1}
                max={numPages}
                className="w-14 h-7 bg-background-surface border border-border rounded text-foreground text-center text-xs focus:outline-none focus:border-border-hover"
              />
              <span className="text-foreground-tertiary text-xs">/ {numPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === numPages}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음 페이지"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M8 4L14 10L8 16"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* 팬 모드 토글 + 줌 컨트롤 */}
          <div className="flex items-center gap-1.5">
            {/* 팬 모드 (마우스 이동) 토글 버튼 */}
            <button
              onClick={() => setIsPanModeEnabled(prev => !prev)}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${isPanModeEnabled
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "hover:bg-background-overlay"
                }`}
              title={isPanModeEnabled ? "이동 모드 끄기 (텍스트 선택 가능)" : "이동 모드 켜기 (드래그로 이동)"}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L10 18M10 2L6 6M10 2L14 6M10 18L6 14M10 18L14 14M2 10L18 10M2 10L6 6M2 10L6 14M18 10L14 6M18 10L14 14"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="축소"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
                <path
                  d="M7 10h6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <span className="text-foreground font-semibold text-xs w-16 text-center bg-background-surface px-1.5 py-0.5 rounded border border-border">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 10}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="확대"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
                <path
                  d="M7 10h6M10 7v6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2 h-7 flex items-center justify-center rounded hover:bg-background-overlay transition-colors text-foreground-tertiary text-xs"
              title="원본 크기"
            >
              리셋
            </button>
          </div>

          {/* 회전 컨트롤 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRotateLeft}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay transition-colors"
              title="왼쪽 회전"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v4l-3-3 3-3v4z" fill="white" />
                <path
                  d="M14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M6 6L4 8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              onClick={handleRotateRight}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-overlay transition-colors"
              title="오른쪽 회전"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                transform="scale(-1, 1)"
              >
                <path d="M10 4v4l-3-3 3-3v4z" fill="white" />
                <path
                  d="M14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M6 6L4 8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

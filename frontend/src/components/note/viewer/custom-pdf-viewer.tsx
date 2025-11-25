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
  usePdfPan,
  usePdfKeyboard,
  usePdfThumbnails,
  usePdfTextLayer,
  usePdfSearch,
} from "@/features/note/viewer";
import { PdfThumbnailSidebar } from "./pdf-thumbnail-sidebar";
import { PDFDrawingOverlay, type PDFDrawingOverlayHandle } from "@/components/note/drawing/pdf-drawing-overlay";
import type { DrawingData } from "@/lib/types/drawing";

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
  onDrawingSave,
}: CustomPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = usePdfPan(containerRef);

  // 썸네일 생성
  const { thumbnails } = usePdfThumbnails({
    pdfDoc,
    numPages,
    currentPage,
  });

  // Keyboard shortcuts
  usePdfKeyboard({
    isPdf,
    numPages,
    currentPage,
    setCurrentPage,
    setScale,
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
    <div className="w-full h-full bg-[#2f2f2f] border-x border-b border-[#3c3c3c] rounded-bl-[15px] rounded-br-[15px] flex flex-col overflow-hidden relative">
      {/* 검색창 */}
      {isSearchOpen && isPdf && (
        <div className="absolute top-2 right-2 z-50 bg-[#252525] border border-[#444444] rounded-lg shadow-lg p-2 flex items-center gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="검색..."
            className="w-48 h-8 bg-[#1e1e1e] border border-[#444444] rounded px-3 text-white text-sm focus:outline-none focus:border-[#666666]"
          />
          <span className="text-gray-400 text-xs min-w-[60px] text-center">
            {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : isSearching ? "검색 중..." : "0/0"}
          </span>
          <button
            onClick={goToPrevMatch}
            disabled={matches.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="이전 (Shift+Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 14L10 6M10 6L6 10M10 6L14 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={goToNextMatch}
            disabled={matches.length === 0}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="다음 (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 6L10 14M10 14L14 10M10 14L6 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={closeSearch}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
            title="닫기 (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M6 6L14 14M14 6L6 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
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
          className="flex-1 overflow-auto bg-[#2a2a2a]"
          onMouseDown={isPanModeEnabled && !drawingMode ? handleMouseDown : undefined}
          onMouseMove={isPanModeEnabled && !drawingMode ? handleMouseMove : undefined}
          onMouseUp={isPanModeEnabled && !drawingMode ? handleMouseUp : undefined}
          onMouseLeave={isPanModeEnabled && !drawingMode ? handleMouseLeave : undefined}
          onWheel={handleWheel}
          style={{
            cursor: drawingMode ? "default" : (isPanModeEnabled ? (isPanning ? "grabbing" : "grab") : "default"),
            userSelect: isPanModeEnabled ? "none" : "auto",
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
          <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
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
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <div className="text-lg">PDF 로딩 중...</div>
              </div>
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

            <div className="inline-block relative" style={{ overflow: "clip" }}>
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
                }}
              />

              {/* Drawing Overlay - PDF Canvas와 정확히 같은 위치/크기 */}
              {drawingEnabled && pdfRenderState && noteId && fileId && (
                <PDFDrawingOverlay
                  ref={drawingOverlayRef}
                  isEnabled={true}
                  isDrawingMode={drawingMode}
                  isCollaborative={isCollaborative}
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
          <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
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
            <p className="text-xs text-gray-500">
              이 파일 형식은 미리보기를 지원하지 않습니다
            </p>
            <a
              href={fileUrl}
              download={fileName}
              className="px-4 py-2 bg-[#444444] hover:bg-[#555555] text-white rounded-lg text-sm transition-colors"
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
        <div className="flex-shrink-0 h-11 bg-[#252525] border-t border-[#3c3c3c] flex items-center justify-between px-3 gap-3">
          {/* 페이지 네비게이션 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                className="w-14 h-7 bg-[#1e1e1e] border border-[#444444] rounded text-white text-center text-xs focus:outline-none focus:border-[#666666]"
              />
              <span className="text-gray-400 text-xs">/ {numPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === numPages}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                isPanModeEnabled
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "hover:bg-[#3c3c3c]"
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

            <div className="w-px h-5 bg-[#444444] mx-1" />

            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

            <span className="text-white font-semibold text-xs w-16 text-center bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#444444]">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 10}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              className="px-2 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors text-gray-400 text-xs"
              title="원본 크기"
            >
              리셋
            </button>
          </div>

          {/* 회전 컨트롤 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRotateLeft}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
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
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
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

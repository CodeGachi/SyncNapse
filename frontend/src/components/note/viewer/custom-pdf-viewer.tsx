/**
 * 커스텀 PDF 뷰어 컴포넌트
 * pdfjs-dist를 직접 사용하여 canvas 렌더링
 * 노트 페이지와 PDF 페이지 동기화
 *
 * Refactored: Business logic separated to features/note/viewer/
 */

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  usePdfLoader,
  usePdfControls,
  usePdfPan,
  usePdfKeyboard,
} from "@/features/note/viewer";

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
}

export function CustomPdfViewer({
  fileUrl,
  fileName,
  fileType,
  onPageChange,
  onPdfRenderInfo,
}: CustomPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Keyboard shortcuts
  usePdfKeyboard({
    isPdf,
    numPages,
    currentPage,
    setCurrentPage,
    setScale,
  });

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

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const context = canvas.getContext("2d");
        if (!context) return;

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

        // 렌더링
        const scaledViewport = page.getViewport({ scale: finalScale, rotation });
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;

        // PDF 렌더링 정보 전달 (드로잉 캔버스 동기화용)
        if (onPdfRenderInfo) {
          // 원본 크기 계산 (scale=1.0, rotation=0 기준)
          const baseViewport = page.getViewport({ scale: 1, rotation: 0 });

          // PDF 크기 정보 콘솔 출력
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📄 PDF 렌더링 정보');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📐 PDF 원본 크기 (scale=1.0):');
          console.log(`   Width: ${baseViewport.width.toFixed(2)}px`);
          console.log(`   Height: ${baseViewport.height.toFixed(2)}px`);
          console.log(`   중심 좌표: (${(baseViewport.width / 2).toFixed(2)}, ${(baseViewport.height / 2).toFixed(2)})`);
          console.log('');
          console.log('🔍 현재 렌더링 크기:');
          console.log(`   Width: ${scaledViewport.width.toFixed(2)}px`);
          console.log(`   Height: ${scaledViewport.height.toFixed(2)}px`);
          console.log(`   Scale: ${finalScale.toFixed(3)} (${(finalScale * 100).toFixed(1)}%)`);
          console.log(`   중심 좌표: (${(scaledViewport.width / 2).toFixed(2)}, ${(scaledViewport.height / 2).toFixed(2)})`);
          console.log('');
          console.log(`📄 페이지: ${currentPage}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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

    renderPage();
  }, [pdfDoc, currentPage, scale, rotation, numPages, onPdfRenderInfo]);

  // 페이지 변경 시 콜백 호출
  useEffect(() => {
    if (onPageChange && isPdf) {
      onPageChange(currentPage);
    }
  }, [currentPage, isPdf, onPageChange]);

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-x border-b border-[#3c3c3c] rounded-bl-[15px] rounded-br-[15px] flex flex-col overflow-hidden">
      {/* 콘텐츠 영역 */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-auto bg-[#2a2a2a]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
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

            <canvas
              ref={canvasRef}
              className={loading || error ? "hidden" : "block m-2"}
              style={{ display: loading || error ? "none" : "block" }}
            />
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

      {/* PDF 컨트롤 바 */}
      {isPdf && fileUrl && numPages > 0 && (
        <div className="flex-shrink-0 h-14 bg-[#252525] border-t border-[#3c3c3c] flex items-center justify-between px-4 gap-4">
          {/* 페이지 네비게이션 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="이전 페이지"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12 4L6 10L12 16"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentPage}
                onChange={handlePageInput}
                min={1}
                max={numPages}
                className="w-16 h-8 bg-[#1e1e1e] border border-[#444444] rounded text-white text-center text-sm focus:outline-none focus:border-[#666666]"
              />
              <span className="text-gray-400 text-sm">/ {numPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === numPages}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음 페이지"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="축소"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
                <path
                  d="M7 10h6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <span className="text-gray-400 text-sm w-16 text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 10}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="확대"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
              className="px-3 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors text-gray-400 text-xs"
              title="원본 크기"
            >
              리셋
            </button>
          </div>

          {/* 회전 컨트롤 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotateLeft}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
              title="왼쪽 회전"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
              title="오른쪽 회전"
            >
              <svg
                width="20"
                height="20"
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

          <div className="text-gray-400 text-xs">
            Page {currentPage} of {numPages}
          </div>
        </div>
      )}
    </div>
  );
}

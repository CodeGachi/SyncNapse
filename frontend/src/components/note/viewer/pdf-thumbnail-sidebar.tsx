/**
 * PDF 썸네일 사이드바 컴포넌트
 * PDF 페이지 썸네일 목록을 표시하고 빠른 네비게이션 제공
 */

"use client";

import { useEffect, useRef, memo, useState } from "react";

interface PdfThumbnailSidebarProps {
  thumbnails: Map<number, HTMLCanvasElement>;
  numPages: number;
  currentPage: number;
  onPageClick: (pageNum: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// 개별 썸네일 아이템 컴포넌트 (메모이제이션)
const ThumbnailItem = memo(({
  pageNum,
  canvas,
  isActive,
  onClick
}: {
  pageNum: number;
  canvas: HTMLCanvasElement | undefined;
  isActive: boolean;
  onClick: () => void;
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (canvas) {
      // Canvas를 이미지 URL로 변환 (cloneNode는 픽셀 데이터를 복사하지 않음)
      try {
        const dataUrl = canvas.toDataURL("image/png");
        setThumbnailUrl(dataUrl);
      } catch (err) {
        console.error("썸네일 변환 실패:", err);
      }
    }
  }, [canvas]);

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded cursor-pointer transition-all ${
        isActive
          ? "bg-[#AFC02B]/20 border-2 border-[#AFC02B]"
          : "bg-[#2f2f2f] border-2 border-transparent hover:border-[#3c3c3c]"
      }`}
    >
      {/* 썸네일 이미지 */}
      <div
        className="w-full flex items-center justify-center overflow-hidden rounded bg-[#1e1e1e]"
        style={{ minHeight: "100px" }}
      >
        {thumbnailUrl ? (
          <img
            ref={imgRef}
            src={thumbnailUrl}
            alt={`Page ${pageNum}`}
            className="w-full h-auto"
          />
        ) : (
          <div className="flex items-center justify-center text-gray-500 text-xs">
            로딩 중...
          </div>
        )}
      </div>

      {/* 페이지 번호 */}
      <div className={`mt-1 text-xs font-medium ${
        isActive ? "text-[#AFC02B]" : "text-gray-400"
      }`}>
        {pageNum}
      </div>
    </div>
  );
});

ThumbnailItem.displayName = "ThumbnailItem";

export const PdfThumbnailSidebar = memo(({
  thumbnails,
  numPages,
  currentPage,
  onPageClick,
  isOpen,
  onToggle,
}: PdfThumbnailSidebarProps) => {
  const activeItemRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 페이지로 자동 스크롤
  useEffect(() => {
    if (activeItemRef.current && containerRef.current && isOpen) {
      const container = containerRef.current;
      const activeItem = activeItemRef.current;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();

      // 현재 페이지가 뷰포트 밖에 있으면 스크롤
      if (activeRect.top < containerRect.top || activeRect.bottom > containerRect.bottom) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentPage, isOpen]);

  if (!isOpen) {
    return (
      <div className="flex items-center justify-center w-8 bg-[#252525] border-r border-[#3c3c3c]">
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
          title="썸네일 열기"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
            <path d="M3 1L9 6L3 11V1Z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[150px] bg-[#252525] border-r border-[#3c3c3c]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#3c3c3c]">
        <span className="text-xs font-medium text-gray-400">썸네일</span>
        <button
          onClick={onToggle}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
          title="썸네일 닫기"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <path d="M1 1L9 9M9 1L1 9" strokeWidth="2" stroke="white" />
          </svg>
        </button>
      </div>

      {/* 썸네일 목록 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2"
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <div
            key={pageNum}
            ref={pageNum === currentPage ? activeItemRef : null}
          >
            <ThumbnailItem
              pageNum={pageNum}
              canvas={thumbnails.get(pageNum)}
              isActive={pageNum === currentPage}
              onClick={() => onPageClick(pageNum)}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

PdfThumbnailSidebar.displayName = "PdfThumbnailSidebar";

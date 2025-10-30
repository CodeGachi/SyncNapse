/**
 * PDF 뷰어 UI 컴포넌트
 * 페이지별 네비게이션 기능 추가
 */

"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useNoteEditorStore } from "@/stores";

interface PdfViewerProps {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  totalPages?: number;
}

export function PdfViewer({ fileUrl, fileName, fileType, totalPages = 10 }: PdfViewerProps) {
  const isPdf = fileType?.includes("pdf");
  const isImage = fileType?.includes("image");

  const { currentPage, setCurrentPage, selectedFileId, initializePageNotes } = useNoteEditorStore();

  // 파일이 변경될 때 페이지 노트 초기화
  useEffect(() => {
    if (selectedFileId && isPdf) {
      initializePageNotes(selectedFileId, totalPages);
    }
  }, [selectedFileId, isPdf, totalPages, initializePageNotes]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-x border-b border-[#3c3c3c] rounded-bl-[15px] rounded-br-[15px] flex flex-col overflow-hidden">
      {/* 파일 뷰어 컨텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
      {!fileUrl ? (
        <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M38 8H14v48h36V22L38 8z" />
            <path d="M38 8v14h12" />
            <path d="M20 30h24M20 38h24M20 46h16" />
          </svg>
          <p className="text-sm">파일을 업로드하면 여기에 표시됩니다</p>
        </div>
      ) : isPdf ? (
        // PDF 파일
        <iframe
          src={`${fileUrl}#page=${currentPage}`}
          className="w-full h-full"
          title={fileName || "PDF Viewer"}
        />
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
        // 기타 파일 (미리보기 불가)
        <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M38 8H14v48h36V22L38 8z" />
            <path d="M38 8v14h12" />
          </svg>
          <p className="text-sm">{fileName}</p>
          <p className="text-xs text-gray-500">이 파일 형식은 미리보기를 지원하지 않습니다</p>
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

      {/* PDF 페이지 네비게이션 */}
      {isPdf && fileUrl && (
        <div className="flex-shrink-0 h-14 bg-[#252525] border-t border-[#3c3c3c] flex items-center justify-center gap-4 px-4">
          {/* 이전 페이지 버튼 */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="이전 페이지"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 페이지 정보 */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={currentPage}
              onChange={handlePageInput}
              min={1}
              max={totalPages}
              className="w-16 h-8 bg-[#1e1e1e] border border-[#444444] rounded text-white text-center text-sm focus:outline-none focus:border-[#666666]"
            />
            <span className="text-gray-400 text-sm">/ {totalPages}</span>
          </div>

          {/* 다음 페이지 버튼 */}
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="다음 페이지"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 4L14 10L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 페이지 정보 텍스트 */}
          <div className="ml-auto text-gray-400 text-xs">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}

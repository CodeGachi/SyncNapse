/**
 * PDF 뷰어 UI 컴포넌트
 */

"use client";

interface PdfViewerProps {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

export function PdfViewer({ fileUrl, fileName, fileType }: PdfViewerProps) {
  const isPdf = fileType?.includes("pdf");
  const isImage = fileType?.includes("image");

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-x border-b border-[#3c3c3c] rounded-bl-[15px] rounded-br-[15px] flex items-center justify-center overflow-hidden">
      {/* 파일 뷰어 컨텐츠 영역 */}
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
          src={fileUrl}
          className="w-full h-full"
          title={fileName || "PDF Viewer"}
        />
      ) : isImage ? (
        // 이미지 파일
        <div className="w-full h-full p-4 overflow-auto flex items-center justify-center">
          <img
            src={fileUrl}
            alt={fileName || "Image"}
            className="max-w-full max-h-full object-contain"
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
  );
}

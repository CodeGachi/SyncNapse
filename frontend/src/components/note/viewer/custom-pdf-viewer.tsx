/**
 * 커스텀 PDF 뷰어 컴포넌트
 * pdfjs-dist를 직접 사용하여 canvas 렌더링
 * 노트 페이지와 PDF 페이지 동기화
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useNoteEditorStore } from "@/stores";

interface CustomPdfViewerProps {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

export function CustomPdfViewer({ fileUrl, fileName, fileType }: CustomPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  const { currentPage, setCurrentPage, selectedFileId, initializePageNotes } = useNoteEditorStore();

  const isPdf = fileType?.includes("pdf");
  const isImage = fileType?.includes("image");

  // PDF.js 동적 로드 (클라이언트에서만)
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");

        // Worker 설정
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        setPdfjsLib(pdfjs);
      } catch (err) {
        console.error("PDF.js 로드 실패:", err);
        setError("PDF 뷰어를 로드할 수 없습니다");
      }
    };

    if (typeof window !== "undefined") {
      loadPdfJs();
    }
  }, []);

  // PDF 문서 로드
  useEffect(() => {
    if (!pdfjsLib || !fileUrl || !isPdf) return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1); // 첫 페이지로 초기화

        // 페이지 노트 초기화
        if (selectedFileId) {
          initializePageNotes(selectedFileId, pdf.numPages);
        }

        console.log(`PDF 로드 완료: ${pdf.numPages} 페이지`);
      } catch (err) {
        console.error("PDF 로드 실패:", err);
        setError("PDF를 로드할 수 없습니다");
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfjsLib, fileUrl, isPdf, selectedFileId, initializePageNotes, setCurrentPage]);

  // PDF 페이지 렌더링
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const viewport = page.getViewport({ scale, rotation });

        // 캔버스 크기 설정
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 렌더링
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        console.log(`페이지 ${currentPage} 렌더링 완료`);
      } catch (err) {
        console.error("페이지 렌더링 실패:", err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, rotation, numPages]);

  // 페이지 네비게이션
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  // 줌 컨트롤
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.5);
  };

  // 회전 컨트롤
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 키보드 단축키
  useEffect(() => {
    if (!isPdf || !numPages) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
          break;
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          if (currentPage < numPages) {
            setCurrentPage(currentPage + 1);
          }
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale((prev) => Math.min(prev + 0.25, 3));
          }
          break;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale((prev) => Math.max(prev - 0.25, 0.5));
          }
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale(1.5);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPdf, numPages, currentPage, setCurrentPage]);

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-x border-b border-[#3c3c3c] rounded-bl-[15px] rounded-br-[15px] flex flex-col overflow-hidden">
      {/* PDF 뷰어 컨텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center overflow-auto bg-[#2a2a2a]">
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
          // PDF 파일 - canvas 렌더링
          <div className="flex items-center justify-center p-4">
            {loading && (
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <div className="text-lg">PDF 로딩 중...</div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 text-red-400">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="32" cy="32" r="28" />
                  <path d="M32 20v16M32 44h.01" strokeLinecap="round" />
                </svg>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-full ${loading || error ? "hidden" : ""}`}
              style={{ display: loading || error ? "none" : "block" }}
            />
          </div>
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

      {/* PDF 컨트롤 바 */}
      {isPdf && fileUrl && numPages > 0 && (
        <div className="flex-shrink-0 h-14 bg-[#252525] border-t border-[#3c3c3c] flex items-center justify-between px-4 gap-4">
          {/* 페이지 네비게이션 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="이전 페이지 (← or PageUp)"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              title="다음 페이지 (→ or PageDown)"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8 4L14 10L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="축소 (Ctrl + -)"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
                <path d="M7 10h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <span className="text-gray-400 text-sm w-16 text-center">{Math.round(scale * 100)}%</span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="확대 (Ctrl + +)"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
                <path d="M7 10h6M10 7v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button
              onClick={handleResetZoom}
              className="px-3 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors text-gray-400 text-xs"
              title="원본 크기 (Ctrl + 0)"
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
                <path d="M14 10a4 4 0 11-8 0 4 4 0 018 0z" stroke="white" strokeWidth="2" fill="none" />
                <path d="M6 6L4 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <button
              onClick={handleRotateRight}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition-colors"
              title="오른쪽 회전"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" transform="scale(-1, 1)">
                <path d="M10 4v4l-3-3 3-3v4z" fill="white" />
                <path d="M14 10a4 4 0 11-8 0 4 4 0 018 0z" stroke="white" strokeWidth="2" fill="none" />
                <path d="M6 6L4 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* 페이지 정보 */}
          <div className="text-gray-400 text-xs">
            Page {currentPage} of {numPages}
          </div>
        </div>
      )}
    </div>
  );
}

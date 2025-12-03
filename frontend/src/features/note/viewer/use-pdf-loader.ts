/**
 * PDF 로더 훅
 * PDF.js 로딩 및 문서 초기화 처리
 */

"use client";

import { useState, useEffect } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("PdfLoader");
import { useNoteEditorStore } from "@/stores";

export function usePdfLoader(fileUrl?: string | null, fileType?: string | null) {
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setCurrentPage, selectedFileId, initializePageNotes } = useNoteEditorStore();

  const isPdf = fileType?.includes("pdf");
  const isImage = fileType?.includes("image");

  // PDF.js CDN에서 직접 로드 (Webpack 번들링 문제 우회)
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        // 이미 로드되어 있는지 확인
        if (typeof window !== "undefined" && (window as any).pdfjsLib) {
          setPdfjsLib((window as any).pdfjsLib);
          return;
        }

        // CDN에서 로드
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        
        script.onload = () => {
          const pdfjs = (window as any).pdfjsLib;
          if (pdfjs) {
            // Worker 경로 설정
            pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            setPdfjsLib(pdfjs);
          } else {
            throw new Error("PDF.js library not found");
          }
        };

        script.onerror = () => {
          setError("PDF 뷰어를 로드할 수 없습니다");
        };

        document.head.appendChild(script);

        // Cleanup
        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (err) {
        log.error("PDF.js 로드 실패:", err);
        setError("PDF 뷰어를 로드할 수 없습니다");
      }
    };

    if (typeof window !== "undefined") {
      loadPdfJs();
    }
  }, []);

  // PDF 문서 로드
  useEffect(() => {
    if (!pdfjsLib || !fileUrl || !isPdf) {
      // 파일이 없으면 상태 초기화
      setPdfDoc(null);
      setNumPages(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let loadingTask: any = null;
    let loadedPdf: any = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        loadedPdf = pdf;

        // 컴포넌트가 언마운트되었거나 파일이 변경된 경우 중단
        if (cancelled) {
          pdf.destroy();
          return;
        }

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);

        if (selectedFileId) {
          initializePageNotes(selectedFileId, pdf.numPages);
        }
      } catch (err) {
        if (!cancelled) {
          setError("PDF를 로드할 수 없습니다");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    // Cleanup: 컴포넌트 언마운트 또는 파일 변경 시 진행 중인 로딩 취소
    return () => {
      cancelled = true;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch (e) {
          // Already destroyed, ignore
        }
      }
      if (loadedPdf) {
        try {
          loadedPdf.destroy();
        } catch (e) {
          // Already destroyed, ignore
        }
      }
    };
  }, [pdfjsLib, fileUrl, isPdf, selectedFileId, initializePageNotes, setCurrentPage]);

  // 비 PDF 파일 로드 시 노트 초기화
  useEffect(() => {
    if (!fileUrl || isPdf) return;

    if (selectedFileId) {
      initializePageNotes(selectedFileId, 1);
      setCurrentPage(1);
    }
  }, [fileUrl, isPdf, selectedFileId, initializePageNotes, setCurrentPage]);

  return {
    pdfDoc,
    numPages,
    loading,
    error,
    isPdf,
    isImage,
  };
}

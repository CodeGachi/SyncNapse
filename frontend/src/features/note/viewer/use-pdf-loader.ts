/**
 * PDF Loader Hook
 * Handles PDF.js loading and document initialization
 */

"use client";

import { useState, useEffect } from "react";
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

  // PDF.js 동적 로드
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
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
        setCurrentPage(1);

        if (selectedFileId) {
          initializePageNotes(selectedFileId, pdf.numPages);
        }
      } catch (err) {
        setError("PDF를 로드할 수 없습니다");
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
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

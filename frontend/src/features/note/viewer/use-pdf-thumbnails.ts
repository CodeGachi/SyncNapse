/**
 * PDF Thumbnails Hook
 * Generates and manages thumbnail canvases for PDF pages
 */

"use client";

import { useEffect, useRef, useState } from "react";

interface ThumbnailData {
  pageNum: number;
  canvas: HTMLCanvasElement | null;
  loading: boolean;
}

interface UsePdfThumbnailsProps {
  pdfDoc: any;
  numPages: number;
  currentPage: number;
}

export function usePdfThumbnails({ pdfDoc, numPages, currentPage }: UsePdfThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, HTMLCanvasElement>>(new Map());
  const [loading, setLoading] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 썸네일 생성 함수
  const generateThumbnail = async (pageNum: number): Promise<HTMLCanvasElement | null> => {
    if (!pdfDoc) return null;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.3 }); // 작은 스케일로 성능 최적화

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;

      // High DPI 지원
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      return canvas;
    } catch (err) {
      console.error(`썸네일 생성 실패 (페이지 ${pageNum}):`, err);
      return null;
    }
  };

  // 현재 페이지 주변 썸네일 우선 생성
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const loadThumbnails = async () => {
      setLoading(true);

      // 현재 페이지와 주변 5페이지 우선 로드
      const priorityPages = [
        currentPage,
        ...Array.from({ length: 5 }, (_, i) => currentPage - i - 1).filter(p => p >= 1),
        ...Array.from({ length: 5 }, (_, i) => currentPage + i + 1).filter(p => p <= numPages),
      ];

      for (const pageNum of priorityPages) {
        if (!thumbnails.has(pageNum)) {
          const canvas = await generateThumbnail(pageNum);
          if (canvas) {
            setThumbnails(prev => new Map(prev).set(pageNum, canvas));
          }
        }
      }

      setLoading(false);
    };

    loadThumbnails();
  }, [pdfDoc, currentPage, numPages]);

  // 모든 썸네일 백그라운드 로드
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const loadAllThumbnails = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (!thumbnails.has(pageNum)) {
          const canvas = await generateThumbnail(pageNum);
          if (canvas) {
            setThumbnails(prev => new Map(prev).set(pageNum, canvas));
          }
          // 렌더링 부담을 줄이기 위해 각 썸네일 사이에 짧은 지연
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };

    // 우선 로드 후 나머지 백그라운드 로드
    const timer = setTimeout(loadAllThumbnails, 500);
    return () => clearTimeout(timer);
  }, [pdfDoc, numPages]);

  return {
    thumbnails,
    loading,
    thumbnailContainerRef,
  };
}

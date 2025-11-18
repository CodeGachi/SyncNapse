/**
 * PDF Thumbnails Hook
 * Generates and manages thumbnail canvases for PDF pages
 */

"use client";

import { useEffect, useRef, useState } from "react";

interface UsePdfThumbnailsProps {
  pdfDoc: any;
  numPages: number;
  currentPage: number;
}

export function usePdfThumbnails({ pdfDoc, numPages, currentPage }: UsePdfThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, HTMLCanvasElement>>(new Map());
  const [loading, setLoading] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // 로드 중인 페이지 추적 (중복 방지)
  const loadingPagesRef = useRef<Set<number>>(new Set());

  // unmount 플래그
  const isMountedRef = useRef(true);

  // 썸네일 생성 함수
  const generateThumbnail = async (pageNum: number): Promise<HTMLCanvasElement | null> => {
    if (!pdfDoc || !isMountedRef.current) return null;

    // 이미 로드 중이면 스킵
    if (loadingPagesRef.current.has(pageNum)) {
      return null;
    }

    loadingPagesRef.current.add(pageNum);

    try {
      const page = await pdfDoc.getPage(pageNum);
      if (!isMountedRef.current) {
        loadingPagesRef.current.delete(pageNum);
        return null;
      }

      const viewport = page.getViewport({ scale: 0.3 }); // 작은 스케일로 성능 최적화

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        loadingPagesRef.current.delete(pageNum);
        return null;
      }

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

      if (!isMountedRef.current) {
        loadingPagesRef.current.delete(pageNum);
        return null;
      }

      loadingPagesRef.current.delete(pageNum);
      return canvas;
    } catch (err) {
      console.error(`썸네일 생성 실패 (페이지 ${pageNum}):`, err);
      loadingPagesRef.current.delete(pageNum);
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
        // 이미 생성되었거나 로드 중이면 스킵
        if (thumbnails.has(pageNum) || loadingPagesRef.current.has(pageNum)) {
          continue;
        }

        const canvas = await generateThumbnail(pageNum);
        if (canvas && isMountedRef.current) {
          setThumbnails(prev => {
            const newMap = new Map(prev);
            newMap.set(pageNum, canvas);
            return newMap;
          });
        }
      }

      if (isMountedRef.current) {
        setLoading(false);
      }
    };

    loadThumbnails();
  }, [pdfDoc, currentPage, numPages, thumbnails]);

  // 모든 썸네일 백그라운드 로드
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let cancelled = false;

    const loadAllThumbnails = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled || !isMountedRef.current) break;

        // 이미 생성되었거나 로드 중이면 스킵
        if (thumbnails.has(pageNum) || loadingPagesRef.current.has(pageNum)) {
          continue;
        }

        const canvas = await generateThumbnail(pageNum);
        if (canvas && !cancelled && isMountedRef.current) {
          setThumbnails(prev => {
            const newMap = new Map(prev);
            newMap.set(pageNum, canvas);
            return newMap;
          });
        }

        // 렌더링 부담을 줄이기 위해 각 썸네일 사이에 짧은 지연
        if (!cancelled) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };

    // 우선 로드 후 나머지 백그라운드 로드
    const timer = setTimeout(loadAllThumbnails, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pdfDoc, numPages, thumbnails]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      loadingPagesRef.current.clear();
    };
  }, []);

  return {
    thumbnails,
    loading,
    thumbnailContainerRef,
  };
}

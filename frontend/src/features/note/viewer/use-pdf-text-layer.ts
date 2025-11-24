/**
 * PDF Text Layer Hook
 * PDF.js 텍스트 레이어 렌더링 - 텍스트 선택 기능 지원
 */

"use client";

import { useEffect, useRef, RefObject, useCallback } from "react";

interface UsePdfTextLayerProps {
  pdfDoc: any;
  currentPage: number;
  scale: number;
  rotation: number;
  textLayerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function usePdfTextLayer({
  pdfDoc,
  currentPage,
  scale,
  rotation,
  textLayerRef,
  canvasRef,
  containerRef,
}: UsePdfTextLayerProps) {
  const renderTaskRef = useRef<any>(null);

  const renderTextLayer = useCallback(async () => {
    if (!pdfDoc || !textLayerRef.current || !canvasRef.current || !containerRef.current) return;

    const textLayerDiv = textLayerRef.current;

    // 이전 텍스트 레이어 정리
    textLayerDiv.innerHTML = "";

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const container = containerRef.current;

      // 컨테이너 크기 계산
      const containerWidth = container.clientWidth - 16;
      const containerHeight = container.clientHeight - 16;

      // 스케일 계산
      const viewport = page.getViewport({ scale: 1, rotation });
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const fitScale = Math.min(scaleX, scaleY);
      const finalScale = fitScale * scale;

      const scaledViewport = page.getViewport({ scale: finalScale, rotation });

      // 텍스트 레이어 크기 설정
      textLayerDiv.style.width = `${scaledViewport.width}px`;
      textLayerDiv.style.height = `${scaledViewport.height}px`;

      // 텍스트 콘텐츠 가져오기
      const textContent = await page.getTextContent();

      // PDF.js TextLayer API 사용
      const pdfjsLib = (window as any).pdfjsLib;

      if (pdfjsLib && pdfjsLib.renderTextLayer) {
        // 이전 렌더 태스크 취소
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: scaledViewport,
          textDivs: [],
        });

        await renderTaskRef.current.promise;
      }
    } catch (err) {
      // 렌더링 취소 시 에러 무시
      if ((err as any)?.name !== "RenderingCancelledException") {
        console.warn("텍스트 레이어 렌더링 실패:", err);
      }
    }
  }, [pdfDoc, currentPage, scale, rotation, textLayerRef, canvasRef, containerRef]);

  useEffect(() => {
    renderTextLayer();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [renderTextLayer]);

  return { renderTextLayer };
}

/**
 * PDF 텍스트 레이어 훅
 * PDF.js 텍스트 레이어 렌더링 - 텍스트 선택 기능 지원
 * PDF.js 3.x 버전 호환
 */

"use client";

import { useEffect, useRef, RefObject, useCallback } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("PdfTextLayer");

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
  const textDivsRef = useRef<HTMLElement[]>([]);

  const renderTextLayer = useCallback(async () => {
    if (!pdfDoc || !textLayerRef.current || !canvasRef.current || !containerRef.current) return;

    const textLayerDiv = textLayerRef.current;
    const canvas = canvasRef.current;

    // 이전 텍스트 레이어 정리
    while (textLayerDiv.firstChild) {
      textLayerDiv.removeChild(textLayerDiv.firstChild);
    }
    textDivsRef.current = [];

    try {
      const page = await pdfDoc.getPage(currentPage);

      // 캔버스의 실제 CSS 크기를 사용 (캔버스와 정확히 일치하도록)
      const canvasWidth = parseFloat(canvas.style.width) || canvas.offsetWidth;
      const canvasHeight = parseFloat(canvas.style.height) || canvas.offsetHeight;

      // 캔버스 크기가 아직 설정되지 않았으면 대기
      if (canvasWidth === 0 || canvasHeight === 0) {
        return;
      }

      // 원본 viewport로 스케일 계산
      const baseViewport = page.getViewport({ scale: 1, rotation });
      const finalScale = canvasWidth / baseViewport.width;

      const scaledViewport = page.getViewport({ scale: finalScale, rotation });

      // 텍스트 레이어 크기를 캔버스와 정확히 일치시킴
      textLayerDiv.style.width = `${canvasWidth}px`;
      textLayerDiv.style.height = `${canvasHeight}px`;
      // PDF.js 3.x 필수: --scale-factor CSS 변수 설정
      textLayerDiv.style.setProperty("--scale-factor", String(finalScale));

      // 텍스트 콘텐츠 가져오기
      const textContent = await page.getTextContent();

      // PDF.js TextLayer API 사용 (3.x 버전)
      const pdfjsLib = (window as any).pdfjsLib;

      if (!pdfjsLib) {
        log.warn("PDF.js 라이브러리 로드 안됨");
        return;
      }

      // 이전 렌더 태스크 취소
      if (renderTaskRef.current && renderTaskRef.current.cancel) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }

      // PDF.js 3.x에서는 TextLayer 클래스를 사용
      if (pdfjsLib.TextLayer) {
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: scaledViewport,
        });

        renderTaskRef.current = textLayer;
        await textLayer.render();
      } else if (pdfjsLib.renderTextLayer) {
        // 구버전 API 폴백
        renderTaskRef.current = pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: scaledViewport,
          textDivs: textDivsRef.current,
        });

        await renderTaskRef.current.promise;
      } else {
        // 수동으로 텍스트 레이어 생성
        await renderTextLayerManually(textContent, scaledViewport, textLayerDiv);
      }
    } catch (err: any) {
      // 렌더링 취소 시 에러 무시
      if (err?.name !== "RenderingCancelledException" && err?.message !== "TextLayer task cancelled.") {
        log.warn("텍스트 레이어 렌더링 실패:", err);
      }
    }
  }, [pdfDoc, currentPage, scale, rotation, textLayerRef, canvasRef]);

  useEffect(() => {
    // 캔버스 렌더링 완료 대기 후 텍스트 레이어 렌더링
    const timer = setTimeout(() => {
      renderTextLayer();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (renderTaskRef.current) {
        if (renderTaskRef.current.cancel) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // ignore
          }
        }
      }
    };
  }, [renderTextLayer]);

  return { renderTextLayer };
}

// 수동 텍스트 레이어 렌더링 (폴백)
async function renderTextLayerManually(
  textContent: any,
  viewport: any,
  container: HTMLDivElement
) {
  const textItems = textContent.items;

  for (const item of textItems) {
    if (!item.str) continue;

    const tx = viewport.transform;
    const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    const fontSize = Math.abs(item.transform[0]) * fontHeight;

    // 변환 행렬에서 위치 계산
    const [a, b, c, d, e, f] = item.transform;

    // viewport 변환 적용
    const x = tx[0] * e + tx[2] * f + tx[4];
    const y = tx[1] * e + tx[3] * f + tx[5];

    const span = document.createElement("span");
    span.textContent = item.str;
    span.style.position = "absolute";
    span.style.left = `${x}px`;
    span.style.top = `${y - fontSize}px`;
    span.style.fontSize = `${fontSize}px`;
    span.style.fontFamily = item.fontName || "sans-serif";
    span.style.transformOrigin = "0% 0%";

    // 텍스트 방향 및 스케일 적용
    if (item.width > 0) {
      const scale = item.width / (item.str.length * fontSize * 0.5);
      span.style.transform = `scaleX(${scale})`;
    }

    container.appendChild(span);
  }
}

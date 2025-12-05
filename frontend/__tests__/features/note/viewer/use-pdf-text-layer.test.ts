/**
 * usePdfTextLayer 훅 테스트
 *
 * Note: 이 훅은 PDF.js TextLayer API에 크게 의존합니다.
 * 기본 기능과 반환값만 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePdfTextLayer } from "@/features/note/viewer/use-pdf-text-layer";
import { createRef } from "react";

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("usePdfTextLayer", () => {
  let textLayerRef: React.RefObject<HTMLDivElement | null>;
  let canvasRef: React.RefObject<HTMLCanvasElement | null>;
  let containerRef: React.RefObject<HTMLDivElement | null>;

  beforeEach(() => {
    vi.clearAllMocks();
    textLayerRef = createRef<HTMLDivElement>();
    canvasRef = createRef<HTMLCanvasElement>();
    containerRef = createRef<HTMLDivElement>();
  });

  describe("초기화", () => {
    it("pdfDoc가 없어도 훅 초기화 성공", () => {
      const { result } = renderHook(() =>
        usePdfTextLayer({
          pdfDoc: null,
          currentPage: 1,
          scale: 1,
          rotation: 0,
          textLayerRef,
          canvasRef,
          containerRef,
        })
      );

      expect(result.current.renderTextLayer).toBeDefined();
      expect(typeof result.current.renderTextLayer).toBe("function");
    });
  });

  describe("반환값", () => {
    it("renderTextLayer 함수 반환", () => {
      const { result } = renderHook(() =>
        usePdfTextLayer({
          pdfDoc: null,
          currentPage: 1,
          scale: 1,
          rotation: 0,
          textLayerRef,
          canvasRef,
          containerRef,
        })
      );

      expect(result.current).toHaveProperty("renderTextLayer");
      expect(typeof result.current.renderTextLayer).toBe("function");
    });
  });

  describe("props 변경", () => {
    it("scale 변경 시 새 renderTextLayer 생성", () => {
      const { result, rerender } = renderHook(
        ({ scale }) =>
          usePdfTextLayer({
            pdfDoc: null,
            currentPage: 1,
            scale,
            rotation: 0,
            textLayerRef,
            canvasRef,
            containerRef,
          }),
        {
          initialProps: { scale: 1 },
        }
      );

      const firstRenderFn = result.current.renderTextLayer;

      rerender({ scale: 2 });

      const secondRenderFn = result.current.renderTextLayer;

      // 콜백이 새로 생성됨 (useCallback deps 변경)
      expect(firstRenderFn).not.toBe(secondRenderFn);
    });

    it("rotation 변경 시 새 renderTextLayer 생성", () => {
      const { result, rerender } = renderHook(
        ({ rotation }) =>
          usePdfTextLayer({
            pdfDoc: null,
            currentPage: 1,
            scale: 1,
            rotation,
            textLayerRef,
            canvasRef,
            containerRef,
          }),
        {
          initialProps: { rotation: 0 },
        }
      );

      const firstRenderFn = result.current.renderTextLayer;

      rerender({ rotation: 90 });

      const secondRenderFn = result.current.renderTextLayer;

      expect(firstRenderFn).not.toBe(secondRenderFn);
    });
  });
});

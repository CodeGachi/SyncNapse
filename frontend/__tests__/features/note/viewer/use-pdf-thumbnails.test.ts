/**
 * usePdfThumbnails 훅 테스트
 *
 * Note: 이 훅은 PDF.js와 Canvas API에 크게 의존합니다.
 * 기본 기능과 반환값만 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePdfThumbnails } from "@/features/note/viewer/use-pdf-thumbnails";


describe("usePdfThumbnails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("pdfDoc가 null일 때 기본 상태 반환", () => {
      const { result } = renderHook(() =>
        usePdfThumbnails({
          pdfDoc: null,
          numPages: 0,
          currentPage: 1,
        })
      );

      expect(result.current.thumbnails).toBeInstanceOf(Map);
      expect(result.current.thumbnails.size).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.thumbnailContainerRef).toBeDefined();
    });
  });

  describe("반환값", () => {
    it("필요한 모든 값 반환", () => {
      const { result } = renderHook(() =>
        usePdfThumbnails({
          pdfDoc: null,
          numPages: 0,
          currentPage: 1,
        })
      );

      expect(result.current).toHaveProperty("thumbnails");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("thumbnailContainerRef");
      expect(result.current.thumbnails instanceof Map).toBe(true);
      expect(typeof result.current.loading).toBe("boolean");
    });
  });

  describe("numPages 변경", () => {
    it("numPages가 0이면 썸네일 생성 안함", () => {
      const { result } = renderHook(() =>
        usePdfThumbnails({
          pdfDoc: {},
          numPages: 0,
          currentPage: 1,
        })
      );

      expect(result.current.thumbnails.size).toBe(0);
    });
  });
});

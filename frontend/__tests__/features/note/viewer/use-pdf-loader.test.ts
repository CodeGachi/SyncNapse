/**
 * use-pdf-loader 훅 테스트
 * PDF.js 로딩 및 문서 초기화 처리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePdfLoader } from "@/features/note/viewer/use-pdf-loader";

// Mock store
const mockSetCurrentPage = vi.fn();
const mockInitializePageNotes = vi.fn();
const mockSelectedFileId = vi.fn(() => "file-1");

vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({
    setCurrentPage: mockSetCurrentPage,
    selectedFileId: mockSelectedFileId(),
    initializePageNotes: mockInitializePageNotes,
  }),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("usePdfLoader", () => {
  let mockPdfDoc: any;
  let mockGetDocument: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPdfDoc = {
      numPages: 10,
      destroy: vi.fn(),
    };

    mockGetDocument = vi.fn(() => ({
      promise: Promise.resolve(mockPdfDoc),
      destroy: vi.fn(),
    }));

    // Setup window.pdfjsLib
    (window as any).pdfjsLib = {
      getDocument: mockGetDocument,
      GlobalWorkerOptions: { workerSrc: "" },
    };

    mockSelectedFileId.mockReturnValue("file-1");
  });

  afterEach(() => {
    delete (window as any).pdfjsLib;
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() => usePdfLoader(null, null));

      expect(result.current.pdfDoc).toBeNull();
      expect(result.current.numPages).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isPdf).toBeFalsy();
      expect(result.current.isImage).toBeFalsy();
    });
  });

  describe("파일 타입 감지", () => {
    it("PDF 파일 감지", () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test", "application/pdf")
      );

      expect(result.current.isPdf).toBe(true);
      expect(result.current.isImage).toBe(false);
    });

    it("이미지 파일 감지", () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test", "image/png")
      );

      expect(result.current.isPdf).toBe(false);
      expect(result.current.isImage).toBe(true);
    });

    it("JPEG 이미지 감지", () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test", "image/jpeg")
      );

      expect(result.current.isImage).toBe(true);
    });
  });

  describe("PDF 문서 로드", () => {
    it("PDF 문서 로드 성공", async () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test.pdf", "application/pdf")
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pdfDoc).toBe(mockPdfDoc);
      expect(result.current.numPages).toBe(10);
      expect(result.current.error).toBeNull();
    });

    it("로드 성공시 첫 페이지로 설정", async () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test.pdf", "application/pdf")
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(1);
    });

    it("로드 성공시 페이지 노트 초기화", async () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test.pdf", "application/pdf")
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockInitializePageNotes).toHaveBeenCalledWith("file-1", 10);
    });

    it("PDF 로드 실패시 에러 상태", async () => {
      mockGetDocument.mockReturnValue({
        promise: Promise.reject(new Error("Load failed")),
        destroy: vi.fn(),
      });

      const { result } = renderHook(() =>
        usePdfLoader("blob:test.pdf", "application/pdf")
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("PDF를 로드할 수 없습니다");
    });
  });

  describe("비 PDF 파일", () => {
    it("이미지 파일 로드시 1페이지로 노트 초기화", async () => {
      const { result } = renderHook(() =>
        usePdfLoader("blob:test.png", "image/png")
      );

      await waitFor(() => {
        expect(mockInitializePageNotes).toHaveBeenCalled();
      });

      expect(mockInitializePageNotes).toHaveBeenCalledWith("file-1", 1);
      expect(mockSetCurrentPage).toHaveBeenCalledWith(1);
    });
  });

  describe("파일 URL 없음", () => {
    it("fileUrl이 없으면 상태 초기화", () => {
      const { result } = renderHook(() => usePdfLoader(null, "application/pdf"));

      expect(result.current.pdfDoc).toBeNull();
      expect(result.current.numPages).toBe(0);
      expect(result.current.loading).toBe(false);
    });

    it("fileUrl이 빈 문자열이면 상태 초기화", () => {
      const { result } = renderHook(() => usePdfLoader("", "application/pdf"));

      expect(result.current.pdfDoc).toBeNull();
      expect(result.current.numPages).toBe(0);
    });
  });

  describe("파일 변경", () => {
    it("다른 파일로 변경시 새로 로드", async () => {
      const { result, rerender } = renderHook(
        ({ url, type }) => usePdfLoader(url, type),
        {
          initialProps: { url: "blob:file1.pdf", type: "application/pdf" },
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetDocument).toHaveBeenCalledTimes(1);

      // 다른 파일로 변경
      rerender({ url: "blob:file2.pdf", type: "application/pdf" });

      await waitFor(() => {
        expect(mockGetDocument).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("selectedFileId 없음", () => {
    it("selectedFileId가 없으면 페이지 노트 초기화하지 않음", async () => {
      mockSelectedFileId.mockReturnValue(null);

      const { result } = renderHook(() =>
        usePdfLoader("blob:test.pdf", "application/pdf")
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockInitializePageNotes).not.toHaveBeenCalled();
    });
  });
});

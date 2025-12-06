/**
 * use-pdf-controls 훅 테스트
 * 확대/축소, 회전, 페이지 네비게이션 관리
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfControls } from "@/features/note/viewer/use-pdf-controls";

// Mock store
const mockCurrentPage = vi.fn(() => 1);
const mockSetCurrentPage = vi.fn();

vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({
    currentPage: mockCurrentPage(),
    setCurrentPage: mockSetCurrentPage,
  }),
}));

describe("usePdfControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentPage.mockReturnValue(1);
  });

  describe("초기 상태", () => {
    it("기본 값 반환", () => {
      const { result } = renderHook(() => usePdfControls(10));

      expect(result.current.scale).toBe(1.0);
      expect(result.current.rotation).toBe(0);
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe("페이지 네비게이션", () => {
    it("handleNextPage - 다음 페이지로 이동", () => {
      mockCurrentPage.mockReturnValue(5);

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleNextPage();
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(6);
    });

    it("handleNextPage - 마지막 페이지에서는 이동하지 않음", () => {
      mockCurrentPage.mockReturnValue(10);

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleNextPage();
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it("handlePrevPage - 이전 페이지로 이동", () => {
      mockCurrentPage.mockReturnValue(5);

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePrevPage();
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(4);
    });

    it("handlePrevPage - 첫 페이지에서는 이동하지 않음", () => {
      mockCurrentPage.mockReturnValue(1);

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePrevPage();
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it("handlePageInput - 유효한 페이지 번호로 이동", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePageInput({
          target: { value: "7" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(7);
    });

    it("handlePageInput - 범위 밖 페이지는 무시", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePageInput({
          target: { value: "15" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it("handlePageInput - 0 이하 페이지는 무시", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePageInput({
          target: { value: "0" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe("확대/축소", () => {
    it("handleZoomIn - 확대", () => {
      const { result } = renderHook(() => usePdfControls(10));

      expect(result.current.scale).toBe(1.0);

      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.scale).toBe(1.25);
    });

    it("handleZoomIn - 최대 10배까지 확대", () => {
      const { result } = renderHook(() => usePdfControls(10));

      // 10배 이상으로 확대 시도
      act(() => {
        result.current.setScale(9.9);
      });

      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.scale).toBe(10);

      // 추가 확대 시도
      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.scale).toBe(10); // 최대값 유지
    });

    it("handleZoomOut - 축소", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleZoomOut();
      });

      expect(result.current.scale).toBe(0.75);
    });

    it("handleZoomOut - 최소 0.5배까지 축소", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.setScale(0.6);
      });

      act(() => {
        result.current.handleZoomOut();
      });

      expect(result.current.scale).toBe(0.5);

      // 추가 축소 시도
      act(() => {
        result.current.handleZoomOut();
      });

      expect(result.current.scale).toBe(0.5); // 최소값 유지
    });

    it("handleResetZoom - 기본 배율로 리셋", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleZoomIn();
        result.current.handleZoomIn();
      });

      expect(result.current.scale).toBe(1.5);

      act(() => {
        result.current.handleResetZoom();
      });

      expect(result.current.scale).toBe(1.0);
    });
  });

  describe("회전", () => {
    it("handleRotateRight - 시계 방향 90도 회전", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleRotateRight();
      });

      expect(result.current.rotation).toBe(90);
    });

    it("handleRotateLeft - 반시계 방향 90도 회전", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleRotateLeft();
      });

      expect(result.current.rotation).toBe(-90);
    });

    it("회전은 360도로 순환", () => {
      const { result } = renderHook(() => usePdfControls(10));

      // 4번 회전하면 360도 (0도)
      act(() => {
        result.current.handleRotateRight();
        result.current.handleRotateRight();
        result.current.handleRotateRight();
        result.current.handleRotateRight();
      });

      expect(result.current.rotation).toBe(0);
    });
  });

  describe("setScale", () => {
    it("직접 배율 설정", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.setScale(2.5);
      });

      expect(result.current.scale).toBe(2.5);
    });
  });

  describe("setCurrentPage", () => {
    it("스토어의 setCurrentPage 함수 반환", () => {
      const { result } = renderHook(() => usePdfControls(10));

      expect(result.current.setCurrentPage).toBe(mockSetCurrentPage);
    });
  });
});

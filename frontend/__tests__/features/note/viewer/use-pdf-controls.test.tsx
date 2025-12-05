/**
 * usePdfControls 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfControls } from "@/features/note/viewer/use-pdf-controls";

// Mock useNoteEditorStore
const mockSetCurrentPage = vi.fn();
let mockCurrentPage = 1;

vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({
    currentPage: mockCurrentPage,
    setCurrentPage: mockSetCurrentPage,
  }),
}));

describe("usePdfControls", () => {
  beforeEach(() => {
    mockCurrentPage = 1;
    mockSetCurrentPage.mockImplementation((page: number) => {
      mockCurrentPage = page;
    });
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("scale이 1.0으로 시작", () => {
      const { result } = renderHook(() => usePdfControls(10));

      expect(result.current.scale).toBe(1.0);
    });

    it("rotation이 0으로 시작", () => {
      const { result } = renderHook(() => usePdfControls(10));

      expect(result.current.rotation).toBe(0);
    });
  });

  describe("페이지 네비게이션", () => {
    it("handleNextPage로 다음 페이지 이동", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleNextPage();
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(2);
    });

    it("마지막 페이지에서 handleNextPage 호출시 변화 없음", () => {
      mockCurrentPage = 10;

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleNextPage();
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it("handlePrevPage로 이전 페이지 이동", () => {
      mockCurrentPage = 5;

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePrevPage();
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(4);
    });

    it("첫 페이지에서 handlePrevPage 호출시 변화 없음", () => {
      mockCurrentPage = 1;

      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handlePrevPage();
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it("handlePageInput으로 특정 페이지 이동", () => {
      const { result } = renderHook(() => usePdfControls(10));

      const mockEvent = {
        target: { value: "5" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handlePageInput(mockEvent);
      });

      expect(mockSetCurrentPage).toHaveBeenCalledWith(5);
    });

    it("범위 밖 페이지 입력시 변화 없음", () => {
      const { result } = renderHook(() => usePdfControls(10));

      const mockEvent = {
        target: { value: "15" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handlePageInput(mockEvent);
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it("0 이하 페이지 입력시 변화 없음", () => {
      const { result } = renderHook(() => usePdfControls(10));

      const mockEvent = {
        target: { value: "0" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handlePageInput(mockEvent);
      });

      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });
  });

  describe("확대/축소", () => {
    it("handleZoomIn으로 0.25 확대", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.scale).toBe(1.25);
    });

    it("최대 확대 10배 제한", () => {
      const { result } = renderHook(() => usePdfControls(10));

      // 10배까지 확대
      act(() => {
        for (let i = 0; i < 40; i++) {
          result.current.handleZoomIn();
        }
      });

      expect(result.current.scale).toBe(10);
    });

    it("handleZoomOut으로 0.25 축소", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleZoomOut();
      });

      expect(result.current.scale).toBe(0.75);
    });

    it("최소 축소 0.5배 제한", () => {
      const { result } = renderHook(() => usePdfControls(10));

      // 최소까지 축소
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.handleZoomOut();
        }
      });

      expect(result.current.scale).toBe(0.5);
    });

    it("handleResetZoom으로 1.0으로 리셋", () => {
      const { result } = renderHook(() => usePdfControls(10));

      // 먼저 확대
      act(() => {
        result.current.handleZoomIn();
        result.current.handleZoomIn();
      });

      expect(result.current.scale).toBe(1.5);

      // 리셋
      act(() => {
        result.current.handleResetZoom();
      });

      expect(result.current.scale).toBe(1.0);
    });
  });

  describe("회전", () => {
    it("handleRotateRight로 90도 회전", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleRotateRight();
      });

      expect(result.current.rotation).toBe(90);
    });

    it("handleRotateLeft로 -90도 회전", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.handleRotateLeft();
      });

      expect(result.current.rotation).toBe(-90);
    });

    it("360도 회전시 0으로 순환", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        for (let i = 0; i < 4; i++) {
          result.current.handleRotateRight();
        }
      });

      expect(result.current.rotation).toBe(0);
    });

    it("-360도 회전시 0으로 순환", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        for (let i = 0; i < 4; i++) {
          result.current.handleRotateLeft();
        }
      });

      // JavaScript에서 -360 % 360 = -0, +0과 동일하게 취급
      expect(result.current.rotation).toBe(-0);
    });
  });

  describe("setScale 직접 호출", () => {
    it("setScale로 scale 직접 설정", () => {
      const { result } = renderHook(() => usePdfControls(10));

      act(() => {
        result.current.setScale(2.5);
      });

      expect(result.current.scale).toBe(2.5);
    });
  });
});

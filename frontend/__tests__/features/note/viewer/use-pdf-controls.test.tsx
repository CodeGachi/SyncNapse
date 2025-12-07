/**
 * usePdfControls 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfControls } from "@/features/note/viewer/use-pdf-controls";

const mockSetCurrentPage = vi.fn();
vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({ currentPage: 1, setCurrentPage: mockSetCurrentPage }),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("usePdfControls", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => usePdfControls(10));
    expect(result.current.scale).toBe(1.0);
    expect(result.current.rotation).toBe(0);
  });

  it("handleNextPage로 다음 페이지", () => {
    const { result } = renderHook(() => usePdfControls(10));
    act(() => { result.current.handleNextPage(); });
    expect(mockSetCurrentPage).toHaveBeenCalledWith(2);
  });

  it("handleZoomIn으로 확대", () => {
    const { result } = renderHook(() => usePdfControls(10));
    act(() => { result.current.handleZoomIn(); });
    expect(result.current.scale).toBe(1.25);
  });

  it("handleRotateRight로 회전", () => {
    const { result } = renderHook(() => usePdfControls(10));
    act(() => { result.current.handleRotateRight(); });
    expect(result.current.rotation).toBe(90);
  });
});

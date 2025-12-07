/**
 * useDrawingPageData 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDrawingPageData } from "@/features/note/drawing/use-drawing-page-data";

vi.mock("@/stores", () => ({ useNoteEditorStore: () => ({ currentPage: 1 }) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("useDrawingPageData", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useDrawingPageData({ noteId: "note-1" }));
    expect(result.current.currentPage).toBe(1);
  });
});

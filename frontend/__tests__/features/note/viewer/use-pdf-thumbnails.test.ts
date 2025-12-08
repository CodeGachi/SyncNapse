import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePdfThumbnails } from "@/features/note/viewer/use-pdf-thumbnails";

describe("usePdfThumbnails", () => {
  it("pdfDoc null일 때 기본 상태", () => {
    const { result } = renderHook(() => usePdfThumbnails({ pdfDoc: null, numPages: 0, currentPage: 1 }));
    expect(result.current.thumbnails.size).toBe(0);
    expect(result.current.loading).toBe(false);
  });
});

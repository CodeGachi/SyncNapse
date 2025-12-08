import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({
    setCurrentPage: vi.fn(),
    selectedFileId: null,
    initializePageNotes: vi.fn(),
  }),
}));

import { usePdfLoader } from "@/features/note/viewer/use-pdf-loader";

describe("usePdfLoader", () => {
  it("URL 없이 초기 상태 반환", () => {
    const { result } = renderHook(() => usePdfLoader(null, null));
    expect(result.current.pdfDoc).toBeNull();
    expect(result.current.numPages).toBe(0);
    expect(result.current.loading).toBe(false);
  });
});

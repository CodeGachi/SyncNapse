/**
 * usePdfLoader 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePdfLoader } from "@/features/note/viewer/use-pdf-loader";

vi.mock("pdfjs-dist", () => ({ getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 5 }) })) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("usePdfLoader", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => usePdfLoader({ url: null }));
    expect(result.current.pdfDoc).toBeNull();
    expect(result.current.numPages).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });
});

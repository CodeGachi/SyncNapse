import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/db/drawings", () => ({ saveDrawing: vi.fn() }));

import { useDrawingSave } from "@/features/note/drawing/use-drawing-save";

describe("useDrawingSave", () => {
  it("handleDrawingSave 함수 반환", () => {
    const { result } = renderHook(() => useDrawingSave({ fileId: "file-1", pageNum: 1 }));
    expect(typeof result.current.handleDrawingSave).toBe("function");
  });
});

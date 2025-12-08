import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/api/services/transcription.api", () => ({
  saveRevision: vi.fn(),
  getSession: vi.fn(),
  getRevisions: vi.fn().mockResolvedValue([]),
}));

import { useScriptRevision } from "@/features/note/right-panel/use-script-revision";

describe("useScriptRevision", () => {
  it("handleSaveRevision 함수 반환", () => {
    const { result } = renderHook(() => useScriptRevision({
      scriptSegments: [],
      setScriptSegments: vi.fn(),
    }));
    expect(typeof result.current.handleSaveRevision).toBe("function");
  });
});

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/api/services/audio.api", () => ({
  getPageContextAtTime: vi.fn(),
}));

import { useScriptPanel } from "@/features/note/right-panel/use-script-panel";

describe("useScriptPanel", () => {
  it("currentTime 초기값 0", () => {
    const { result } = renderHook(() => useScriptPanel({ timelineEvents: [] }));
    expect(result.current.currentTime).toBe(0);
  });
});

/**
 * use-cursor-presence 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUpdateMyPresence = vi.fn();
vi.mock("@/lib/liveblocks", () => ({
  useUpdateMyPresence: () => mockUpdateMyPresence,
  useOthers: () => [],
}));

import { useCursorBroadcast, useOthersCursors } from "@/features/note/collaboration/use-cursor-presence";

beforeEach(() => { vi.clearAllMocks(); });

describe("useCursorBroadcast", () => {
  it("containerRef와 handlePointerMove 반환", () => {
    const { result } = renderHook(() => useCursorBroadcast());
    expect(result.current.containerRef).toBeDefined();
    expect(typeof result.current.handlePointerMove).toBe("function");
  });
});

describe("useOthersCursors", () => {
  it("빈 커서 목록 반환", () => {
    const { result } = renderHook(() => useOthersCursors());
    expect(result.current).toEqual([]);
  });
});

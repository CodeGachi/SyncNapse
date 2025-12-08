/**
 * use-cursor-presence 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";

const mockUpdateMyPresence = vi.fn();
vi.mock("@/lib/liveblocks", () => ({
  useUpdateMyPresence: () => mockUpdateMyPresence,
  useOthers: () => [],
}));

import { useCursorBroadcast, useOthersCursors } from "@/features/note/collaboration/use-cursor-presence";

beforeEach(() => { vi.clearAllMocks(); });

describe("useCursorBroadcast", () => {
  it("containerRef가 주어지면 정상 동작", () => {
    const { result } = renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(null);
      useCursorBroadcast(containerRef, false, false);
      return containerRef;
    });
    expect(result.current).toBeDefined();
  });
});

describe("useOthersCursors", () => {
  it("빈 커서 목록 반환", () => {
    const { result } = renderHook(() => useOthersCursors({ educatorOnly: false }));
    expect(result.current).toEqual([]);
  });
});

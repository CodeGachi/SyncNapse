import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn((selector: any) => selector({ polls: [] })),
  useMutation: () => vi.fn(),
  useBroadcastEvent: () => vi.fn(),
  useEventListener: vi.fn(),
}));

import { usePoll } from "@/features/note/collaboration/use-poll";

describe("usePoll", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => usePoll({ userId: "user-1", isEducator: false }));
    expect(result.current.polls).toEqual([]);
  });
});

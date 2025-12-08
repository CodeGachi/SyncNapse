import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn((selector: any) => selector({ handRaises: [] })),
  useMutation: () => vi.fn(),
  useBroadcastEvent: () => vi.fn(),
  useEventListener: vi.fn(),
}));

import { useHandRaise } from "@/features/note/collaboration/use-hand-raise";

describe("useHandRaise", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useHandRaise({ userId: "user-1", userName: "User 1", isEducator: false }));
    expect(result.current.handRaises).toEqual([]);
  });
});

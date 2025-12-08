/**
 * usePoll 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockBroadcast = vi.fn();
vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useBroadcastEvent: () => mockBroadcast,
  useEventListener: vi.fn(),
}));

import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { usePoll } from "@/features/note/collaboration/use-poll";

beforeEach(() => { vi.clearAllMocks(); });

describe("usePoll", () => {
  it("빈 투표 목록", () => {
    (useStorage as any).mockImplementation((selector: any) => selector({ polls: [] }));
    const { result } = renderHook(() => usePoll({ userId: "user-1", isEducator: false }));
    expect(result.current.polls).toEqual([]);
    expect(result.current.activePoll).toBeUndefined();
  });

  it("handleVote로 투표", () => {
    (useStorage as any).mockImplementation((selector: any) => selector({ polls: [] }));
    const { result } = renderHook(() => usePoll({ userId: "user-1", isEducator: false }));
    act(() => { result.current.handleVote("poll-1", 0); });
    expect(mockBroadcast).toHaveBeenCalledWith({ type: "POLL_VOTE", pollId: "poll-1", optionIndex: 0, userId: "user-1" });
  });

  it("handleEndPoll로 종료", () => {
    (useStorage as any).mockImplementation((selector: any) => selector({ polls: [] }));
    const { result } = renderHook(() => usePoll({ userId: "educator-1", isEducator: true }));
    act(() => { result.current.handleEndPoll("poll-1"); });
    expect(mockBroadcast).toHaveBeenCalledWith({ type: "POLL_ENDED", pollId: "poll-1" });
  });
});

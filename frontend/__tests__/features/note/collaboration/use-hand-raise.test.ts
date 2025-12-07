/**
 * useHandRaise 훅 테스트
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
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { useHandRaise } from "@/features/note/collaboration/use-hand-raise";

beforeEach(() => { vi.clearAllMocks(); });

describe("useHandRaise", () => {
  it("빈 손들기 목록", () => {
    (useStorage as any).mockImplementation((selector: any) => selector({ handRaises: [] }));
    const { result } = renderHook(() => useHandRaise({ userId: "user-1", userName: "User 1", isEducator: false }));
    expect(result.current.handRaises).toEqual([]);
    expect(result.current.isHandRaised).toBe(false);
  });

  it("handleRaiseHand로 손들기", () => {
    (useStorage as any).mockImplementation((selector: any) => selector({ handRaises: [] }));
    const { result } = renderHook(() => useHandRaise({ userId: "user-1", userName: "User 1", isEducator: false }));
    act(() => { result.current.handleRaiseHand(); });
    expect(mockBroadcast).toHaveBeenCalledWith({ type: "HAND_RAISE", userId: "user-1", userName: "User 1" });
  });

  it("이미 손들기 중이면 무시", () => {
    const handRaises = [{ id: "1", userId: "user-1", userName: "User 1", timestamp: 1000, isActive: true }];
    (useStorage as any).mockImplementation((selector: any) => selector({ handRaises }));
    const { result } = renderHook(() => useHandRaise({ userId: "user-1", userName: "User 1", isEducator: false }));
    act(() => { result.current.handleRaiseHand(); });
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});

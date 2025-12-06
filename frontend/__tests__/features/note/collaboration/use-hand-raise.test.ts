/**
 * use-hand-raise 테스트
 * 손들기 기능 훅 (Liveblocks 실시간 버전)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock Liveblocks
const mockBroadcast = vi.fn();
const mockMutation = vi.fn();

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
  useMutation: vi.fn((fn) => {
    mockMutation.mockImplementation((...args) => fn({ storage: mockStorageObj }, ...args));
    return mockMutation;
  }),
  useBroadcastEvent: () => mockBroadcast,
  useEventListener: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useStorage, useMutation } from "@/lib/liveblocks/liveblocks.config";
import { useHandRaise } from "@/features/note/collaboration/use-hand-raise";

// Mock storage object
const mockHandRaises: any[] = [];
const mockStorageObj = {
  get: vi.fn((key: string) => {
    if (key === "handRaises") {
      return {
        find: (fn: any) => mockHandRaises.find(fn),
        push: (item: any) => mockHandRaises.push(item),
        findIndex: (fn: any) => mockHandRaises.findIndex(fn),
        get: (index: number) => mockHandRaises[index],
        set: (index: number, value: any) => { mockHandRaises[index] = value; },
        length: mockHandRaises.length,
      };
    }
    return null;
  }),
};

describe("useHandRaise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandRaises.length = 0;

    (useStorage as any).mockImplementation((selector: (root: any) => any) => {
      return selector({ handRaises: mockHandRaises });
    });
  });

  describe("초기 상태", () => {
    it("빈 손들기 목록", () => {
      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-1",
          userName: "Test User",
          isEducator: false,
        })
      );

      expect(result.current.handRaises).toEqual([]);
      expect(result.current.activeHandRaises).toEqual([]);
      expect(result.current.isHandRaised).toBe(false);
      expect(result.current.myHandRaise).toBeUndefined();
    });
  });

  describe("손들기 목록 필터링", () => {
    it("활성화된 손들기만 필터링", () => {
      const handRaisesWithMixed = [
        { id: "1", userId: "user-1", userName: "User 1", timestamp: 1000, isActive: true },
        { id: "2", userId: "user-2", userName: "User 2", timestamp: 2000, isActive: false },
        { id: "3", userId: "user-3", userName: "User 3", timestamp: 3000, isActive: true },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises: handRaisesWithMixed });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-4",
          userName: "User 4",
          isEducator: false,
        })
      );

      expect(result.current.activeHandRaises).toHaveLength(2);
      expect(result.current.activeHandRaises.every((h) => h.isActive)).toBe(true);
    });

    it("활성화된 손들기 오래된 순 정렬", () => {
      const handRaises = [
        { id: "1", userId: "user-1", userName: "User 1", timestamp: 3000, isActive: true },
        { id: "2", userId: "user-2", userName: "User 2", timestamp: 1000, isActive: true },
        { id: "3", userId: "user-3", userName: "User 3", timestamp: 2000, isActive: true },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-4",
          userName: "User 4",
          isEducator: false,
        })
      );

      expect(result.current.activeHandRaises[0].timestamp).toBe(1000);
      expect(result.current.activeHandRaises[1].timestamp).toBe(2000);
      expect(result.current.activeHandRaises[2].timestamp).toBe(3000);
    });
  });

  describe("현재 사용자 손들기 상태", () => {
    it("내가 손들기 중인 경우", () => {
      const handRaises = [
        { id: "1", userId: "user-1", userName: "User 1", timestamp: 1000, isActive: true },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-1",
          userName: "User 1",
          isEducator: false,
        })
      );

      expect(result.current.isHandRaised).toBe(true);
      expect(result.current.myHandRaise).toBeDefined();
      expect(result.current.myHandRaise?.userId).toBe("user-1");
    });

    it("내가 손들기 중이 아닌 경우", () => {
      const handRaises = [
        { id: "1", userId: "user-1", userName: "User 1", timestamp: 1000, isActive: true },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-2",
          userName: "User 2",
          isEducator: false,
        })
      );

      expect(result.current.isHandRaised).toBe(false);
      expect(result.current.myHandRaise).toBeUndefined();
    });

    it("손들기가 비활성화된 경우", () => {
      const handRaises = [
        { id: "1", userId: "user-1", userName: "User 1", timestamp: 1000, isActive: false },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-1",
          userName: "User 1",
          isEducator: false,
        })
      );

      expect(result.current.isHandRaised).toBe(false);
      expect(result.current.myHandRaise).toBeUndefined();
    });
  });

  describe("handleRaiseHand", () => {
    it("손들기 버튼 클릭 시 broadcast 이벤트 전송", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises: [] });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-1",
          userName: "Test User",
          isEducator: false,
        })
      );

      act(() => {
        result.current.handleRaiseHand();
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "HAND_RAISE",
        userId: "user-1",
        userName: "Test User",
      });
    });

    it("이미 손들기 중이면 무시", () => {
      const handRaises = [
        { id: "1", userId: "user-1", userName: "User 1", timestamp: 1000, isActive: true },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ handRaises });
      });

      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-1",
          userName: "User 1",
          isEducator: false,
        })
      );

      act(() => {
        result.current.handleRaiseHand();
      });

      expect(mockBroadcast).not.toHaveBeenCalled();
    });
  });

  describe("Educator 권한", () => {
    it("isEducator 기본값 false", () => {
      const { result } = renderHook(() =>
        useHandRaise({
          userId: "user-1",
          userName: "User 1",
        })
      );

      expect(result.current.handleRespond).toBeDefined();
      expect(result.current.handleClearAll).toBeDefined();
    });
  });
});

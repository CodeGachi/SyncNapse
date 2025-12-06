/**
 * use-poll 테스트
 * 투표 기능 훅 (Liveblocks 실시간 버전)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock Liveblocks
const mockBroadcast = vi.fn();
const mockMutation = vi.fn();

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
  useMutation: vi.fn((fn) => mockMutation),
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

import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { usePoll, type Poll } from "@/features/note/collaboration/use-poll";

describe("usePoll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("빈 투표 목록", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "user-1",
          isEducator: false,
        })
      );

      expect(result.current.polls).toEqual([]);
      expect(result.current.activePoll).toBeUndefined();
    });
  });

  describe("활성 투표 찾기", () => {
    it("활성화된 투표 반환", () => {
      const polls: Poll[] = [
        {
          id: "poll-1",
          question: "Question 1?",
          options: [
            { text: "Option A", votes: [] },
            { text: "Option B", votes: [] },
          ],
          createdBy: "educator-1",
          createdAt: 1000,
          isActive: false,
        },
        {
          id: "poll-2",
          question: "Active Poll?",
          options: [
            { text: "Yes", votes: ["user-1"] },
            { text: "No", votes: [] },
          ],
          createdBy: "educator-1",
          createdAt: 2000,
          isActive: true,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "user-1",
          isEducator: false,
        })
      );

      expect(result.current.activePoll).toBeDefined();
      expect(result.current.activePoll?.id).toBe("poll-2");
      expect(result.current.activePoll?.question).toBe("Active Poll?");
    });

    it("활성 투표 없으면 undefined", () => {
      const polls: Poll[] = [
        {
          id: "poll-1",
          question: "Ended Poll?",
          options: [{ text: "Option", votes: [] }],
          createdBy: "educator-1",
          createdAt: 1000,
          isActive: false,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "user-1",
          isEducator: false,
        })
      );

      expect(result.current.activePoll).toBeUndefined();
    });
  });

  describe("handleCreatePoll", () => {
    it("유효한 투표 생성 시 broadcast 전송", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "educator-1",
          isEducator: true,
        })
      );

      act(() => {
        result.current.handleCreatePoll("What is your choice?", ["A", "B", "C"]);
      });

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "POLL_CREATED",
          question: "What is your choice?",
        })
      );
    });

    it("질문이 비어있으면 생성 안함", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "educator-1",
          isEducator: true,
        })
      );

      act(() => {
        result.current.handleCreatePoll("  ", ["A", "B"]);
      });

      expect(mockBroadcast).not.toHaveBeenCalled();
    });

    it("옵션이 2개 미만이면 생성 안함", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "educator-1",
          isEducator: true,
        })
      );

      act(() => {
        result.current.handleCreatePoll("Question?", ["Only one option"]);
      });

      expect(mockBroadcast).not.toHaveBeenCalled();
    });

    it("빈 옵션은 필터링됨", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "educator-1",
          isEducator: true,
        })
      );

      act(() => {
        result.current.handleCreatePoll("Question?", ["A", "  ", "B", ""]);
      });

      // 유효한 옵션 2개 (A, B)이므로 생성됨
      expect(mockBroadcast).toHaveBeenCalled();
    });
  });

  describe("handleVote", () => {
    it("투표 시 broadcast 전송", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "user-1",
          isEducator: false,
        })
      );

      act(() => {
        result.current.handleVote("poll-1", 0);
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "POLL_VOTE",
        pollId: "poll-1",
        optionIndex: 0,
        userId: "user-1",
      });
    });
  });

  describe("handleEndPoll", () => {
    it("투표 종료 시 broadcast 전송", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls: [] });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "educator-1",
          isEducator: true,
        })
      );

      act(() => {
        result.current.handleEndPoll("poll-1");
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "POLL_ENDED",
        pollId: "poll-1",
      });
    });
  });

  describe("투표 데이터 구조", () => {
    it("투표 옵션에 투표자 목록 포함", () => {
      const polls: Poll[] = [
        {
          id: "poll-1",
          question: "Test Poll",
          options: [
            { text: "Option A", votes: ["user-1", "user-2"] },
            { text: "Option B", votes: ["user-3"] },
          ],
          createdBy: "educator-1",
          createdAt: 1000,
          isActive: true,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ polls });
      });

      const { result } = renderHook(() =>
        usePoll({
          userId: "user-1",
          isEducator: false,
        })
      );

      const activePoll = result.current.activePoll;
      expect(activePoll?.options[0].votes).toHaveLength(2);
      expect(activePoll?.options[1].votes).toHaveLength(1);
    });
  });
});

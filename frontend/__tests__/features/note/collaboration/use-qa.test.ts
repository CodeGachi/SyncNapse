/**
 * use-qa 테스트
 * Q&A 기능 훅 (Liveblocks 실시간 버전)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock Liveblocks
const mockBroadcast = vi.fn();
const mockMutation = vi.fn();

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
  useMutation: vi.fn((fn) => mockMutation),
  useBroadcastEvent: () => mockBroadcast,
  useEventListener: vi.fn(),
}));

vi.mock("@/lib/api/services/questions.api", () => ({
  createQuestion: vi.fn().mockResolvedValue({}),
  toggleQuestionUpvote: vi.fn().mockResolvedValue({}),
  toggleQuestionPin: vi.fn().mockResolvedValue({}),
  deleteQuestion: vi.fn().mockResolvedValue({}),
  addAnswer: vi.fn().mockResolvedValue({}),
  deleteAnswer: vi.fn().mockResolvedValue({}),
  markAnswerAsBest: vi.fn().mockResolvedValue({}),
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
import { useQA, type QAQuestion } from "@/features/note/collaboration/use-qa";

describe("useQA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("빈 질문 목록", () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      expect(result.current.questions).toEqual([]);
      expect(result.current.sortedQuestions).toEqual([]);
    });
  });

  describe("질문 정렬", () => {
    it("핀 고정된 질문이 맨 위", () => {
      const questions: QAQuestion[] = [
        {
          id: "q-1",
          content: "Regular question",
          authorId: "user-1",
          authorName: "User 1",
          createdAt: 1000,
          answers: [],
          upvotes: [],
          isPinned: false,
          isSharedToAll: false,
        },
        {
          id: "q-2",
          content: "Pinned question",
          authorId: "user-2",
          authorName: "User 2",
          createdAt: 2000,
          answers: [],
          upvotes: [],
          isPinned: true,
          isSharedToAll: false,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "User 1",
          noteId: "note-1",
          isEducator: false,
        })
      );

      expect(result.current.sortedQuestions[0].id).toBe("q-2"); // 핀 고정된 것이 첫 번째
      expect(result.current.sortedQuestions[1].id).toBe("q-1");
    });

    it("추천 많은 순 정렬 (핀 고정 같으면)", () => {
      const questions: QAQuestion[] = [
        {
          id: "q-1",
          content: "Less upvotes",
          authorId: "user-1",
          authorName: "User 1",
          createdAt: 1000,
          answers: [],
          upvotes: ["user-a"],
          isPinned: false,
          isSharedToAll: false,
        },
        {
          id: "q-2",
          content: "More upvotes",
          authorId: "user-2",
          authorName: "User 2",
          createdAt: 2000,
          answers: [],
          upvotes: ["user-a", "user-b", "user-c"],
          isPinned: false,
          isSharedToAll: false,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "User 1",
          noteId: "note-1",
          isEducator: false,
        })
      );

      expect(result.current.sortedQuestions[0].id).toBe("q-2"); // 추천 많은 것이 첫 번째
    });

    it("추천 같으면 최신순 정렬", () => {
      const questions: QAQuestion[] = [
        {
          id: "q-1",
          content: "Older",
          authorId: "user-1",
          authorName: "User 1",
          createdAt: 1000,
          answers: [],
          upvotes: [],
          isPinned: false,
          isSharedToAll: false,
        },
        {
          id: "q-2",
          content: "Newer",
          authorId: "user-2",
          authorName: "User 2",
          createdAt: 2000,
          answers: [],
          upvotes: [],
          isPinned: false,
          isSharedToAll: false,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "User 1",
          noteId: "note-1",
          isEducator: false,
        })
      );

      expect(result.current.sortedQuestions[0].id).toBe("q-2"); // 최신 것이 첫 번째
    });
  });

  describe("handleAddQuestion", () => {
    it("질문 추가 시 broadcast 전송", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      await act(async () => {
        await result.current.handleAddQuestion("What is this?");
      });

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "QUESTION_ADDED",
          content: "What is this?",
          authorName: "Test User",
        })
      );
    });

    it("빈 질문은 추가 안함", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      await act(async () => {
        await result.current.handleAddQuestion("   ");
      });

      expect(mockBroadcast).not.toHaveBeenCalled();
    });
  });

  describe("handleUpvote", () => {
    it("추천 시 broadcast 전송", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      await act(async () => {
        await result.current.handleUpvote("q-1");
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "QUESTION_UPVOTED",
        questionId: "q-1",
        userId: "user-1",
      });
    });
  });

  describe("handleDelete", () => {
    it("삭제 시 broadcast 전송", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      await act(async () => {
        await result.current.handleDelete("q-1");
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "QUESTION_DELETED",
        questionId: "q-1",
      });
    });
  });

  describe("handleAddAnswer", () => {
    it("답변 추가 시 broadcast 전송", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      await act(async () => {
        await result.current.handleAddAnswer("q-1", "This is my answer");
      });

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ANSWER_ADDED",
          questionId: "q-1",
          authorName: "Test User",
        })
      );
    });
  });

  describe("handleDeleteAnswer", () => {
    it("답변 삭제 시 broadcast 전송", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "Test User",
          noteId: "note-1",
          isEducator: false,
        })
      );

      await act(async () => {
        await result.current.handleDeleteAnswer("q-1", "a-1");
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "ANSWER_DELETED",
        questionId: "q-1",
        answerId: "a-1",
      });
    });
  });

  describe("handleMarkAnswerAsBest", () => {
    it("베스트 답변 표시 시 broadcast 전송", async () => {
      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions: [] });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "educator-1",
          userName: "Educator",
          noteId: "note-1",
          isEducator: true,
        })
      );

      await act(async () => {
        await result.current.handleMarkAnswerAsBest("q-1", "a-1");
      });

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: "ANSWER_MARKED_BEST",
        questionId: "q-1",
        answerId: "a-1",
      });
    });
  });

  describe("질문 데이터 구조", () => {
    it("질문에 답변 배열 포함", () => {
      const questions: QAQuestion[] = [
        {
          id: "q-1",
          content: "Question with answers",
          authorId: "user-1",
          authorName: "User 1",
          createdAt: 1000,
          answers: [
            {
              id: "a-1",
              content: "Answer 1",
              authorId: "user-2",
              authorName: "User 2",
              createdAt: 2000,
              isBest: false,
            },
            {
              id: "a-2",
              content: "Answer 2",
              authorId: "educator-1",
              authorName: "Educator",
              createdAt: 3000,
              isBest: true,
            },
          ],
          upvotes: ["user-3"],
          isPinned: false,
          isSharedToAll: false,
        },
      ];

      (useStorage as any).mockImplementation((selector: (root: any) => any) => {
        return selector({ questions });
      });

      const { result } = renderHook(() =>
        useQA({
          userId: "user-1",
          userName: "User 1",
          noteId: "note-1",
          isEducator: false,
        })
      );

      expect(result.current.questions[0].answers).toHaveLength(2);
      expect(result.current.questions[0].answers[1].isBest).toBe(true);
    });
  });
});

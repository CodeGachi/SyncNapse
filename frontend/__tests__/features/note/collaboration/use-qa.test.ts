/**
 * use-qa 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useBroadcastEvent: () => vi.fn(),
  useEventListener: vi.fn(),
}));
vi.mock("@/lib/api/services/questions.api", () => ({
  createQuestion: vi.fn().mockResolvedValue({}),
  toggleQuestionUpvote: vi.fn().mockResolvedValue({}),
  deleteQuestion: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { useQA } from "@/features/note/collaboration/use-qa";

beforeEach(() => { vi.clearAllMocks(); });

describe("useQA", () => {
  it("빈 질문 목록 반환", () => {
    (useStorage as any).mockImplementation((selector: any) => selector({ questions: [] }));
    const { result } = renderHook(() => useQA("note-1", "user-1"));
    expect(result.current.questions).toEqual([]);
  });

  it("질문 목록 반환", () => {
    const mockQuestions = [{ id: "q1", content: "Test?", authorId: "user-1", createdAt: Date.now() }];
    (useStorage as any).mockImplementation((selector: any) => selector({ questions: mockQuestions }));
    const { result } = renderHook(() => useQA("note-1", "user-1"));
    expect(result.current.questions).toHaveLength(1);
  });
});

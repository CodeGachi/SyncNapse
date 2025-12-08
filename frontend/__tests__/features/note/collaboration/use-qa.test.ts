import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn((selector: any) => selector({ questions: [] })),
  useMutation: () => vi.fn(),
  useBroadcastEvent: () => vi.fn(),
  useEventListener: vi.fn(),
}));
vi.mock("@/lib/api/services/questions.api", () => ({
  createQuestion: vi.fn(),
  toggleQuestionUpvote: vi.fn(),
  deleteQuestion: vi.fn(),
}));

import { useQA } from "@/features/note/collaboration/use-qa";

describe("useQA", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useQA("note-1", "user-1"));
    expect(result.current.questions).toEqual([]);
  });
});

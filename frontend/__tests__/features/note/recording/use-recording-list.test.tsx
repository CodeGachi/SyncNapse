/**
 * useRecordingList 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRecordingList } from "@/features/note/recording/use-recording-list";

vi.mock("@/lib/api/queries/audio.queries", () => ({
  useRecordingSessions: vi.fn(() => ({ data: [], isLoading: false })),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("useRecordingList", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useRecordingList({ noteId: "note-1" }));
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

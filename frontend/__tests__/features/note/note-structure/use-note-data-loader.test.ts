/**
 * useNoteDataLoader 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNoteDataLoader } from "@/features/note/note-structure/use-note-data-loader";

vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNote: vi.fn(() => ({ data: null, isLoading: false })),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("useNoteDataLoader", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useNoteDataLoader({ noteId: "note-1" }));
    expect(result.current.note).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

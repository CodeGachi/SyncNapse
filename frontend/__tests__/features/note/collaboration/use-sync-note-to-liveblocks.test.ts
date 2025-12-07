/**
 * useSyncNoteToLiveblocks 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useStorage: vi.fn(() => null),
}));

import { useSyncNoteToLiveblocks } from "@/features/note/collaboration/use-sync-note-to-liveblocks";

beforeEach(() => { vi.clearAllMocks(); });

describe("useSyncNoteToLiveblocks", () => {
  it("훅 호출 시 에러 없음", () => {
    expect(() => renderHook(() => useSyncNoteToLiveblocks({ noteId: "note-1" }))).not.toThrow();
  });
});

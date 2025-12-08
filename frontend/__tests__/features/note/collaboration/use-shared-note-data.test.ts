import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/liveblocks/liveblocks.config", () => ({
  useStorage: vi.fn((selector: any) => selector({ noteInfo: null, files: [], pageNotes: {}, currentPage: 1, currentFileId: null })),
}));
vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({ setFiles: vi.fn(), setSelectedFileId: vi.fn(), setCurrentPage: vi.fn(), setPageNotes: vi.fn() }),
}));
vi.mock("@/lib/db", () => ({ initDB: vi.fn() }));

import { useSharedNoteData } from "@/features/note/collaboration/use-shared-note-data";

describe("useSharedNoteData", () => {
  it("비공유 모드", () => {
    const { result } = renderHook(() => useSharedNoteData({ isSharedView: false, noteId: "note-1" }));
    expect(result.current.isLoading).toBe(false);
  });
});

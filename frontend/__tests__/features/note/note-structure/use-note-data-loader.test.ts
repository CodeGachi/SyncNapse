import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({ loadFiles: vi.fn() }),
}));
vi.mock("@/lib/api/queries/files.queries", () => ({
  useFilesWithIdByNote: () => ({ data: [] }),
}));

import { useNoteDataLoader } from "@/features/note/note-structure/use-note-data-loader";

describe("useNoteDataLoader", () => {
  it("noteId 없이 호출 가능", () => {
    const { result } = renderHook(() => useNoteDataLoader({ noteId: null }));
    expect(result).toBeDefined();
  });
});

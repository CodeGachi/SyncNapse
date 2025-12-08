import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/stores", () => ({
  useNoteEditorStore: () => ({ addFile: vi.fn(), removeFile: vi.fn() }),
}));
vi.mock("@/lib/api/mutations/files.mutations", () => ({
  useSaveNoteFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/api/services/files.api", () => ({ deleteFile: vi.fn() }));

import { useFileManagement } from "@/features/note/right-panel/use-file-management";

describe("useFileManagement", () => {
  it("기본 반환값", () => {
    const { result } = renderHook(() => useFileManagement());
    expect(result.current.handleAddFile).toBeDefined();
    expect(result.current.isSaving).toBe(false);
  });
});

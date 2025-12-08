import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/api/services/folders.api", () => ({ moveFolder: vi.fn() }));
vi.mock("@/lib/api/services/notes.api", () => ({ updateNote: vi.fn() }));

import { useFolderDragDrop } from "@/features/dashboard/folders/use-folder-drag-drop";

describe("useFolderDragDrop", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useFolderDragDrop());
    expect(result.current.draggedItem).toBeNull();
    expect(result.current.dragOverItem).toBeNull();
  });
});

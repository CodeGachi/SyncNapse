import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/stores", () => ({
  useNoteSettingsStore: () => ({
    title: "", selectedLocation: "root", uploadedFiles: [], isDragActive: false,
    validationErrors: [], noteType: "student", reset: vi.fn(),
    setTitle: vi.fn(), setSelectedLocation: vi.fn(), setValidationErrors: vi.fn(),
    setIsDragActive: vi.fn(), addUploadedFiles: vi.fn(), removeUploadedFile: vi.fn(),
    updateUploadedFile: vi.fn(), setNoteType: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-file-upload", () => ({
  useFileUpload: () => ({ files: [], addFiles: vi.fn(), startUpload: vi.fn(), isUploading: false }),
}));
vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({ folders: [] }),
}));
vi.mock("@/lib/utils", () => ({
  validateFiles: vi.fn(() => ({ validFiles: [], invalidFiles: [], duplicates: [] })),
  generateSafeFileName: vi.fn((name: string) => name),
  calculateStorageUsage: vi.fn(() => ({ used: 0, total: 100 * 1024 * 1024, percentage: 0 })),
}));

import { useCreateNoteModal } from "@/features/dashboard/notes/use-create-note-modal";

describe("useCreateNoteModal", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useCreateNoteModal(vi.fn()));
    expect(result.current.title).toBe("");
    expect(result.current.isCreating).toBe(false);
  });
});

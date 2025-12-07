/**
 * useCreateNoteModal 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreateNoteModal } from "@/features/dashboard/notes/use-create-note-modal";
import { useNoteSettingsStore } from "@/stores";

vi.mock("@/stores", () => ({ useNoteSettingsStore: vi.fn() }));
vi.mock("@/hooks/use-file-upload", () => ({
  useFileUpload: vi.fn(() => ({ files: [], addFiles: vi.fn(), startUpload: vi.fn(), isUploading: false })),
}));
vi.mock("@/features/dashboard", () => ({
  useFolders: vi.fn(() => ({ folders: [{ id: "folder-1", name: "Folder 1", parentId: null }] })),
}));
vi.mock("@/lib/utils", () => ({
  validateFiles: vi.fn((files: File[]) => ({ validFiles: files, invalidFiles: [], duplicates: [] })),
  generateSafeFileName: vi.fn((name: string) => `${name}_copy`),
  calculateStorageUsage: vi.fn(() => ({ used: 0, total: 100 * 1024 * 1024, percentage: 0 })),
}));
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const mockReset = vi.fn();
const defaultStore = {
  title: "", selectedLocation: "root", uploadedFiles: [], isDragActive: false,
  validationErrors: [], noteType: "student" as const, reset: mockReset,
  setTitle: vi.fn(), setSelectedLocation: vi.fn(), setValidationErrors: vi.fn(),
  setIsDragActive: vi.fn(), addUploadedFiles: vi.fn(), removeUploadedFile: vi.fn(),
  updateUploadedFile: vi.fn(), setNoteType: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useNoteSettingsStore).mockReturnValue(defaultStore);
});

describe("useCreateNoteModal", () => {
  it("초기화 및 기본 상태", () => {
    const { result } = renderHook(() => useCreateNoteModal(vi.fn()));
    expect(result.current.title).toBe("");
    expect(result.current.selectedLocation).toBe("root");
    expect(result.current.isCreating).toBe(false);
  });

  it("handleSubmit으로 노트 생성", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useNoteSettingsStore).mockReturnValue({ ...defaultStore, title: "Test" });
    const { result } = renderHook(() => useCreateNoteModal(onSubmit));

    await act(async () => await result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "Test" }));
    expect(mockReset).toHaveBeenCalled();
  });
});

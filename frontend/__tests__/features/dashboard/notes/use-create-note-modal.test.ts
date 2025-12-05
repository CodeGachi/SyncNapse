/**
 * useCreateNoteModal 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreateNoteModal } from "@/features/dashboard/notes/use-create-note-modal";
import { useNoteSettingsStore } from "@/stores";

// Mock dependencies
vi.mock("@/stores", () => ({
  useNoteSettingsStore: vi.fn(),
}));

vi.mock("@/hooks/use-file-upload", () => ({
  useFileUpload: vi.fn(() => ({
    files: [],
    addFiles: vi.fn(),
    startUpload: vi.fn(),
    isUploading: false,
  })),
}));

vi.mock("@/features/dashboard", () => ({
  useFolders: vi.fn(() => ({
    folders: [
      { id: "root-folder-id", name: "Root", parentId: null },
      { id: "folder-1", name: "Folder 1", parentId: "root-folder-id" },
      { id: "folder-2", name: "Folder 2", parentId: "root-folder-id" },
    ],
  })),
}));

vi.mock("@/lib/utils", () => ({
  validateFiles: vi.fn((files: File[]) => ({
    validFiles: files,
    invalidFiles: [],
    duplicates: [],
  })),
  generateSafeFileName: vi.fn((name: string) => `${name}_copy`),
  calculateStorageUsage: vi.fn((files: File[]) => ({
    used: files.reduce((sum, f) => sum + f.size, 0),
    total: 1024 * 1024 * 100, // 100MB
    percentage: 10,
  })),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useCreateNoteModal", () => {
  const mockSetTitle = vi.fn();
  const mockSetSelectedLocation = vi.fn();
  const mockSetValidationErrors = vi.fn();
  const mockSetIsDragActive = vi.fn();
  const mockAddUploadedFiles = vi.fn();
  const mockRemoveUploadedFile = vi.fn();
  const mockUpdateUploadedFile = vi.fn();
  const mockSetNoteType = vi.fn();
  const mockReset = vi.fn();

  const defaultStoreState = {
    title: "",
    selectedLocation: "root",
    uploadedFiles: [],
    isDragActive: false,
    validationErrors: [],
    noteType: "student" as const,
    setTitle: mockSetTitle,
    setSelectedLocation: mockSetSelectedLocation,
    setValidationErrors: mockSetValidationErrors,
    setIsDragActive: mockSetIsDragActive,
    addUploadedFiles: mockAddUploadedFiles,
    removeUploadedFile: mockRemoveUploadedFile,
    updateUploadedFile: mockUpdateUploadedFile,
    setNoteType: mockSetNoteType,
    reset: mockReset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNoteSettingsStore).mockReturnValue(defaultStoreState);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("초기화", () => {
    it("기본 상태로 초기화", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.title).toBe("");
      expect(result.current.selectedLocation).toBe("root");
      expect(result.current.uploadedFiles).toEqual([]);
      expect(result.current.isDragActive).toBe(false);
      expect(result.current.noteType).toBe("student");
      expect(result.current.isCreating).toBe(false);
    });

    it("defaultFolderId가 제공되면 해당 폴더로 설정", () => {
      const onSubmit = vi.fn();
      renderHook(() => useCreateNoteModal(onSubmit, "folder-1"));

      expect(mockSetSelectedLocation).toHaveBeenCalledWith("folder-1");
    });

    it("initialNoteType이 educator이면 educator로 설정", () => {
      const onSubmit = vi.fn();
      renderHook(() => useCreateNoteModal(onSubmit, null, "educator"));

      expect(mockSetNoteType).toHaveBeenCalledWith("educator");
    });
  });

  describe("getSelectedFolderName", () => {
    it("root면 Root 반환", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.getSelectedFolderName()).toBe("Root");
    });

    it("선택된 폴더 이름 반환", () => {
      vi.mocked(useNoteSettingsStore).mockReturnValue({
        ...defaultStoreState,
        selectedLocation: "folder-1",
      });

      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.getSelectedFolderName()).toBe("Folder 1");
    });

    it("Root 시스템 폴더면 Root 반환", () => {
      vi.mocked(useNoteSettingsStore).mockReturnValue({
        ...defaultStoreState,
        selectedLocation: "root-folder-id",
      });

      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.getSelectedFolderName()).toBe("Root");
    });
  });

  describe("드래그 앤 드롭", () => {
    it("handleDragOver로 isDragActive true 설정", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockSetIsDragActive).toHaveBeenCalledWith(true);
    });

    it("handleDragLeave로 isDragActive false 설정", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      const mockEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragLeave(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockSetIsDragActive).toHaveBeenCalledWith(false);
    });

    it("handleDrop으로 파일 추가", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });
      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockSetIsDragActive).toHaveBeenCalledWith(false);
      expect(mockSetValidationErrors).toHaveBeenCalledWith([]);
    });
  });

  describe("handleFileChange", () => {
    it("input에서 파일 선택시 파일 추가", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(mockEvent);
      });

      expect(mockSetValidationErrors).toHaveBeenCalledWith([]);
    });

    it("files가 null이면 빈 배열로 처리", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      const mockEvent = {
        target: {
          files: null,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFileChange(mockEvent);
      });

      // 에러 없이 처리됨
      expect(mockSetValidationErrors).toHaveBeenCalledWith([]);
    });
  });

  describe("handleSubmit", () => {
    it("제목과 파일로 노트 생성 제출", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useNoteSettingsStore).mockReturnValue({
        ...defaultStoreState,
        title: "Test Note",
        selectedLocation: "folder-1",
        noteType: "student",
        uploadedFiles: [],
      });

      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        title: "Test Note",
        location: "folder-1",
        files: [],
        type: "student",
      });
      expect(mockReset).toHaveBeenCalled();
    });

    it("제목이 비어있으면 첫 번째 파일명 사용", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const mockFile = new File(["test"], "my-document.pdf", { type: "application/pdf" });

      vi.mocked(useNoteSettingsStore).mockReturnValue({
        ...defaultStoreState,
        title: "",
        uploadedFiles: [{ file: mockFile, progress: 100, status: "completed" }],
      });

      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "my-document", // 확장자 제외
        })
      );
    });

    it("제목도 파일도 없으면 '제목 없음' 사용", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useNoteSettingsStore).mockReturnValue({
        ...defaultStoreState,
        title: "",
        uploadedFiles: [],
      });

      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "제목 없음",
        })
      );
    });

    it("제출 중 isCreating이 true", async () => {
      let resolvePromise: () => void;
      const onSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.isCreating).toBe(false);

      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.handleSubmit();
      });

      // isCreating이 true가 되었는지 확인
      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      // 완료
      await act(async () => {
        resolvePromise!();
        await submitPromise;
      });
    });

    it("제출 실패시 alert 표시", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(alertSpy).toHaveBeenCalledWith("Network error");
      alertSpy.mockRestore();
    });

    it("이미 제출 중이면 중복 제출 방지", async () => {
      let resolvePromise: () => void;
      const onSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      // 첫 번째 제출 시작
      act(() => {
        result.current.handleSubmit();
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      // 두 번째 제출 시도 (무시되어야 함)
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);

      // 정리
      await act(async () => {
        resolvePromise!();
      });
    });
  });

  describe("storageUsage", () => {
    it("파일이 없으면 null 반환", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.storageUsage).toBeNull();
    });

    it("파일이 있으면 저장 공간 계산", () => {
      const mockFile = new File(["test content"], "test.pdf", { type: "application/pdf" });

      vi.mocked(useNoteSettingsStore).mockReturnValue({
        ...defaultStoreState,
        uploadedFiles: [{ file: mockFile, progress: 100, status: "completed" }],
      });

      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.storageUsage).not.toBeNull();
      expect(result.current.storageUsage?.percentage).toBe(10);
    });
  });

  describe("폴더 선택기", () => {
    it("isFolderSelectorOpen 토글", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      expect(result.current.isFolderSelectorOpen).toBe(false);

      act(() => {
        result.current.setIsFolderSelectorOpen(true);
      });

      expect(result.current.isFolderSelectorOpen).toBe(true);
    });
  });

  describe("reset", () => {
    it("reset 호출시 스토어 초기화", () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useCreateNoteModal(onSubmit));

      act(() => {
        result.current.reset();
      });

      expect(mockReset).toHaveBeenCalled();
    });
  });
});

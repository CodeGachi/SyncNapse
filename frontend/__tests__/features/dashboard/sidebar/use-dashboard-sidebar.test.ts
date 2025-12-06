/**
 * use-dashboard-sidebar 훅 테스트
 * 대시보드 사이드바 비즈니스 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardSidebar } from "@/features/dashboard/sidebar/use-dashboard-sidebar";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock router
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock folders hook
const mockCreateFolder = vi.fn();
const mockRenameFolder = vi.fn();
const mockDeleteFolder = vi.fn();
const mockFolders = vi.fn(() => [
  { id: "folder-1", name: "Work", parentId: null },
  { id: "folder-2", name: "Personal", parentId: null },
]);

vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({
    folders: mockFolders(),
    createFolder: mockCreateFolder,
    renameFolder: mockRenameFolder,
    deleteFolder: mockDeleteFolder,
  }),
}));

// Mock delete note mutation
const mockDeleteNoteMutateAsync = vi.fn();

vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useDeleteNote: () => ({
    mutateAsync: mockDeleteNoteMutateAsync,
  }),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("useDashboardSidebar", () => {
  let queryClient: QueryClient;
  const mockOnSelectFolder = vi.fn();

  const defaultProps = {
    selectedFolderId: "folder-1",
    onSelectFolder: mockOnSelectFolder,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      expect(result.current.isNoteDropdownOpen).toBe(false);
      expect(result.current.isNoteModalOpen).toBe(false);
      expect(result.current.selectedNoteType).toBe("student");
      expect(result.current.isCreateFolderModalOpen).toBe(false);
      expect(result.current.renamingFolder).toBeNull();
      expect(result.current.deletingFolder).toBeNull();
      expect(result.current.deletingNote).toBeNull();
    });
  });

  describe("노트 드롭다운", () => {
    it("toggleNoteDropdown - 드롭다운 토글", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      expect(result.current.isNoteDropdownOpen).toBe(false);

      act(() => {
        result.current.toggleNoteDropdown();
      });

      expect(result.current.isNoteDropdownOpen).toBe(true);

      act(() => {
        result.current.toggleNoteDropdown();
      });

      expect(result.current.isNoteDropdownOpen).toBe(false);
    });

    it("closeNoteDropdown - 드롭다운 닫기", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.toggleNoteDropdown();
      });

      act(() => {
        result.current.closeNoteDropdown();
      });

      expect(result.current.isNoteDropdownOpen).toBe(false);
    });
  });

  describe("노트 모달", () => {
    it("openNoteModal - student 타입으로 모달 열기", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.openNoteModal("student");
      });

      expect(result.current.isNoteModalOpen).toBe(true);
      expect(result.current.selectedNoteType).toBe("student");
      expect(result.current.isNoteDropdownOpen).toBe(false);
    });

    it("openNoteModal - educator 타입으로 모달 열기", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.openNoteModal("educator");
      });

      expect(result.current.isNoteModalOpen).toBe(true);
      expect(result.current.selectedNoteType).toBe("educator");
    });

    it("closeNoteModal - 모달 닫기", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.openNoteModal("student");
      });

      act(() => {
        result.current.closeNoteModal();
      });

      expect(result.current.isNoteModalOpen).toBe(false);
    });
  });

  describe("네비게이션", () => {
    it("navigateToProfile", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.navigateToProfile();
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard/profile");
    });

    it("navigateToTrash", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.navigateToTrash();
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard/trash");
    });

    it("navigateToHome", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.navigateToHome();
      });

      expect(mockOnSelectFolder).toHaveBeenCalledWith(null);
      expect(mockPush).toHaveBeenCalledWith("/dashboard/main");
    });

    it("navigateToLogout", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.navigateToLogout();
      });

      expect(mockPush).toHaveBeenCalledWith("/auth/logout");
    });
  });

  describe("폴더 생성", () => {
    it("handleCreateFolderModal - 폴더 생성", async () => {
      mockCreateFolder.mockResolvedValue({});

      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleCreateFolderModal("New Folder", null);
      });

      expect(mockCreateFolder).toHaveBeenCalledWith("New Folder", null);
    });

    it("handleCreateSubFolder - 하위 폴더 생성 모달 열기", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleCreateSubFolder("folder-1");
      });

      expect(result.current.createSubfolderParentId).toBe("folder-1");
      expect(result.current.isCreateFolderModalOpen).toBe(true);
    });

    it("closeCreateFolderModal - 폴더 생성 모달 닫기", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleCreateSubFolder("folder-1");
      });

      act(() => {
        result.current.closeCreateFolderModal();
      });

      expect(result.current.isCreateFolderModalOpen).toBe(false);
      expect(result.current.createSubfolderParentId).toBeNull();
    });
  });

  describe("폴더 이름 변경", () => {
    it("handleRenameFolder - 폴더 찾아서 상태 설정", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleRenameFolder("folder-1");
      });

      expect(result.current.renamingFolder).toEqual({
        id: "folder-1",
        name: "Work",
        parentId: null,
      });
    });

    it("handleRenameSubmit - 이름 변경 실행", async () => {
      mockRenameFolder.mockResolvedValue({});

      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleRenameFolder("folder-1");
      });

      await act(async () => {
        await result.current.handleRenameSubmit("New Name");
      });

      expect(mockRenameFolder).toHaveBeenCalledWith("folder-1", "New Name");
      expect(result.current.renamingFolder).toBeNull();
    });
  });

  describe("폴더 삭제", () => {
    it("handleDeleteFolder - 폴더 찾아서 상태 설정", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleDeleteFolder("folder-1");
      });

      expect(result.current.deletingFolder).toEqual({
        id: "folder-1",
        name: "Work",
        parentId: null,
      });
    });

    it("handleDeleteSubmit - 폴더 삭제 실행", async () => {
      mockDeleteFolder.mockResolvedValue({});

      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleDeleteFolder("folder-2");
      });

      await act(async () => {
        await result.current.handleDeleteSubmit();
      });

      expect(mockDeleteFolder).toHaveBeenCalledWith("folder-2");
      expect(result.current.deletingFolder).toBeNull();
    });

    it("handleDeleteSubmit - 선택된 폴더 삭제시 선택 해제", async () => {
      mockDeleteFolder.mockResolvedValue({});

      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleDeleteFolder("folder-1"); // selectedFolderId와 동일
      });

      await act(async () => {
        await result.current.handleDeleteSubmit();
      });

      expect(mockOnSelectFolder).toHaveBeenCalledWith(null);
    });
  });

  describe("노트 삭제", () => {
    it("handleDeleteNote - 노트 삭제 상태 설정", () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleDeleteNote("note-1", "Test Note");
      });

      expect(result.current.deletingNote).toEqual({
        id: "note-1",
        title: "Test Note",
      });
    });

    it("handleDeleteNoteSubmit - 노트 삭제 실행", async () => {
      mockDeleteNoteMutateAsync.mockResolvedValue({});

      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      act(() => {
        result.current.handleDeleteNote("note-1", "Test Note");
      });

      await act(async () => {
        await result.current.handleDeleteNoteSubmit();
      });

      expect(mockDeleteNoteMutateAsync).toHaveBeenCalledWith("note-1");
      expect(result.current.deletingNote).toBeNull();
    });

    it("handleDeleteNoteSubmit - deletingNote 없으면 무시", async () => {
      const { result } = renderHook(() => useDashboardSidebar(defaultProps), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleDeleteNoteSubmit();
      });

      expect(mockDeleteNoteMutateAsync).not.toHaveBeenCalled();
    });
  });
});

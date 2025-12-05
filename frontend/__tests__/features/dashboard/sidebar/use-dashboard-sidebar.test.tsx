/**
 * useDashboardSidebar 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardSidebar } from "@/features/dashboard/sidebar/use-dashboard-sidebar";
import { ReactNode } from "react";

// Mock next/navigation
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock useFolders
const mockCreateFolder = vi.fn();
const mockRenameFolder = vi.fn();
const mockDeleteFolder = vi.fn();

vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({
    folders: [
      { id: "folder-1", name: "Test Folder", parentId: null },
      { id: "folder-2", name: "Sub Folder", parentId: "folder-1" },
    ],
    createFolder: mockCreateFolder,
    renameFolder: mockRenameFolder,
    deleteFolder: mockDeleteFolder,
  }),
}));

// Mock useDeleteNote
const mockDeleteNoteMutation = {
  mutateAsync: vi.fn(),
};

vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useDeleteNote: () => mockDeleteNoteMutation,
}));

describe("useDashboardSidebar", () => {
  let queryClient: QueryClient;
  let mockOnSelectFolder: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockOnSelectFolder = vi.fn();
    vi.clearAllMocks();
  });

  describe("노트 드롭다운", () => {
    it("toggleNoteDropdown으로 드롭다운 토글", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

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

    it("closeNoteDropdown으로 드롭다운 닫기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.toggleNoteDropdown();
      });

      expect(result.current.isNoteDropdownOpen).toBe(true);

      act(() => {
        result.current.closeNoteDropdown();
      });

      expect(result.current.isNoteDropdownOpen).toBe(false);
    });
  });

  describe("노트 모달", () => {
    it("openNoteModal로 노트 모달 열기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.openNoteModal("student");
      });

      expect(result.current.isNoteModalOpen).toBe(true);
      expect(result.current.selectedNoteType).toBe("student");
      expect(result.current.isNoteDropdownOpen).toBe(false);
    });

    it("educator 타입으로 노트 모달 열기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.openNoteModal("educator");
      });

      expect(result.current.selectedNoteType).toBe("educator");
    });

    it("closeNoteModal로 노트 모달 닫기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

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
    it("navigateToProfile으로 프로필 페이지 이동", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.navigateToProfile();
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/profile");
    });

    it("navigateToTrash으로 휴지통 페이지 이동", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.navigateToTrash();
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/trash");
    });

    it("navigateToHome으로 메인 페이지 이동", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: "folder-1",
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.navigateToHome();
      });

      expect(mockOnSelectFolder).toHaveBeenCalledWith(null);
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/main");
    });

    it("navigateToLogout으로 로그아웃 페이지 이동", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.navigateToLogout();
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/auth/logout");
    });
  });

  describe("폴더 생성", () => {
    it("handleCreateFolderModal로 폴더 생성", async () => {
      mockCreateFolder.mockResolvedValue({ id: "new-folder" });

      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleCreateFolderModal("New Folder", null);
      });

      expect(mockCreateFolder).toHaveBeenCalledWith("New Folder", null);
    });

    it("handleCreateSubFolder로 하위 폴더 생성 모달 열기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleCreateSubFolder("folder-1");
      });

      expect(result.current.createSubfolderParentId).toBe("folder-1");
      expect(result.current.isCreateFolderModalOpen).toBe(true);
    });

    it("closeCreateFolderModal로 폴더 생성 모달 닫기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleCreateSubFolder("folder-1");
      });

      act(() => {
        result.current.closeCreateFolderModal();
      });

      expect(result.current.isCreateFolderModalOpen).toBe(false);
      expect(result.current.createSubfolderParentId).toBe(null);
    });
  });

  describe("폴더 이름 변경", () => {
    it("handleRenameFolder로 이름 변경 모달 열기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleRenameFolder("folder-1");
      });

      expect(result.current.renamingFolder).toEqual({
        id: "folder-1",
        name: "Test Folder",
        parentId: null,
      });
    });

    it("handleRenameSubmit로 이름 변경 실행", async () => {
      mockRenameFolder.mockResolvedValue({});

      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleRenameFolder("folder-1");
      });

      await act(async () => {
        await result.current.handleRenameSubmit("Renamed Folder");
      });

      expect(mockRenameFolder).toHaveBeenCalledWith("folder-1", "Renamed Folder");
      expect(result.current.renamingFolder).toBe(null);
    });

    it("renamingFolder가 없으면 handleRenameSubmit 무시", async () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleRenameSubmit("New Name");
      });

      expect(mockRenameFolder).not.toHaveBeenCalled();
    });
  });

  describe("폴더 삭제", () => {
    it("handleDeleteFolder로 삭제 모달 열기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleDeleteFolder("folder-1");
      });

      expect(result.current.deletingFolder).toEqual({
        id: "folder-1",
        name: "Test Folder",
        parentId: null,
      });
    });

    it("handleDeleteSubmit로 폴더 삭제", async () => {
      mockDeleteFolder.mockResolvedValue({});

      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleDeleteFolder("folder-1");
      });

      await act(async () => {
        await result.current.handleDeleteSubmit();
      });

      expect(mockDeleteFolder).toHaveBeenCalledWith("folder-1");
      expect(result.current.deletingFolder).toBe(null);
    });

    it("선택된 폴더가 삭제되면 선택 해제", async () => {
      mockDeleteFolder.mockResolvedValue({});

      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: "folder-1",
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleDeleteFolder("folder-1");
      });

      await act(async () => {
        await result.current.handleDeleteSubmit();
      });

      expect(mockOnSelectFolder).toHaveBeenCalledWith(null);
    });
  });

  describe("노트 삭제", () => {
    it("handleDeleteNote로 삭제 모달 열기", () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleDeleteNote("note-1", "Test Note");
      });

      expect(result.current.deletingNote).toEqual({
        id: "note-1",
        title: "Test Note",
      });
    });

    it("handleDeleteNoteSubmit로 노트 삭제", async () => {
      mockDeleteNoteMutation.mutateAsync.mockResolvedValue({});

      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      act(() => {
        result.current.handleDeleteNote("note-1", "Test Note");
      });

      await act(async () => {
        await result.current.handleDeleteNoteSubmit();
      });

      expect(mockDeleteNoteMutation.mutateAsync).toHaveBeenCalledWith("note-1");
      expect(result.current.deletingNote).toBe(null);
    });

    it("deletingNote가 없으면 handleDeleteNoteSubmit 무시", async () => {
      const { result } = renderHook(
        () =>
          useDashboardSidebar({
            selectedFolderId: null,
            onSelectFolder: mockOnSelectFolder,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleDeleteNoteSubmit();
      });

      expect(mockDeleteNoteMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });
});

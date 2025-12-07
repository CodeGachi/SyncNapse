/**
 * useDashboardSidebar 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardSidebar } from "@/features/dashboard/sidebar/use-dashboard-sidebar";
import { ReactNode } from "react";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

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

const mockDeleteNoteMutation = { mutateAsync: vi.fn() };
vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useDeleteNote: () => mockDeleteNoteMutation,
}));

let queryClient: QueryClient;
let mockOnSelectFolder: ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

beforeEach(() => {
  queryClient.clear();
  mockOnSelectFolder = vi.fn();
  vi.clearAllMocks();
});

describe("useDashboardSidebar", () => {
  const createHook = (selectedFolderId: string | null = null) =>
    renderHook(
      () => useDashboardSidebar({ selectedFolderId, onSelectFolder: mockOnSelectFolder }),
      { wrapper }
    );

  it("드롭다운/모달 토글", () => {
    const { result } = createHook();

    // 노트 드롭다운
    expect(result.current.isNoteDropdownOpen).toBe(false);
    act(() => result.current.toggleNoteDropdown());
    expect(result.current.isNoteDropdownOpen).toBe(true);
    act(() => result.current.closeNoteDropdown());
    expect(result.current.isNoteDropdownOpen).toBe(false);

    // 노트 모달 (student/educator)
    act(() => result.current.openNoteModal("student"));
    expect(result.current.isNoteModalOpen).toBe(true);
    expect(result.current.selectedNoteType).toBe("student");

    act(() => result.current.closeNoteModal());
    expect(result.current.isNoteModalOpen).toBe(false);

    act(() => result.current.openNoteModal("educator"));
    expect(result.current.selectedNoteType).toBe("educator");
  });

  it("네비게이션", () => {
    const { result } = createHook("folder-1");

    act(() => result.current.navigateToProfile());
    expect(mockRouterPush).toHaveBeenLastCalledWith("/dashboard/profile");

    act(() => result.current.navigateToTrash());
    expect(mockRouterPush).toHaveBeenLastCalledWith("/dashboard/trash");

    act(() => result.current.navigateToHome());
    expect(mockOnSelectFolder).toHaveBeenCalledWith(null);
    expect(mockRouterPush).toHaveBeenLastCalledWith("/dashboard/main");

    act(() => result.current.navigateToLogout());
    expect(mockRouterPush).toHaveBeenLastCalledWith("/auth/logout");
  });

  it("폴더 CRUD", async () => {
    const { result } = createHook();

    // 생성
    mockCreateFolder.mockResolvedValue({ id: "new-folder" });
    await act(async () => await result.current.handleCreateFolderModal("New Folder", null));
    expect(mockCreateFolder).toHaveBeenCalledWith("New Folder", null);

    // 하위 폴더 생성 모달
    act(() => result.current.handleCreateSubFolder("folder-1"));
    expect(result.current.createSubfolderParentId).toBe("folder-1");
    expect(result.current.isCreateFolderModalOpen).toBe(true);

    act(() => result.current.closeCreateFolderModal());
    expect(result.current.isCreateFolderModalOpen).toBe(false);

    // 이름 변경
    act(() => result.current.handleRenameFolder("folder-1"));
    expect(result.current.renamingFolder?.id).toBe("folder-1");

    mockRenameFolder.mockResolvedValue({});
    await act(async () => await result.current.handleRenameSubmit("Renamed"));
    expect(mockRenameFolder).toHaveBeenCalledWith("folder-1", "Renamed");
    expect(result.current.renamingFolder).toBe(null);

    // 삭제
    act(() => result.current.handleDeleteFolder("folder-1"));
    expect(result.current.deletingFolder?.id).toBe("folder-1");

    mockDeleteFolder.mockResolvedValue({});
    await act(async () => await result.current.handleDeleteSubmit());
    expect(mockDeleteFolder).toHaveBeenCalledWith("folder-1");
  });

  it("선택된 폴더 삭제시 선택 해제", async () => {
    const { result } = createHook("folder-1");
    mockDeleteFolder.mockResolvedValue({});

    act(() => result.current.handleDeleteFolder("folder-1"));
    await act(async () => await result.current.handleDeleteSubmit());
    expect(mockOnSelectFolder).toHaveBeenCalledWith(null);
  });

  it("노트 삭제", async () => {
    const { result } = createHook();

    act(() => result.current.handleDeleteNote("note-1", "Test Note"));
    expect(result.current.deletingNote).toEqual({ id: "note-1", title: "Test Note" });

    mockDeleteNoteMutation.mutateAsync.mockResolvedValue({});
    await act(async () => await result.current.handleDeleteNoteSubmit());
    expect(mockDeleteNoteMutation.mutateAsync).toHaveBeenCalledWith("note-1");
    expect(result.current.deletingNote).toBe(null);
  });

  it("상태 없으면 submit 무시", async () => {
    const { result } = createHook();

    await act(async () => await result.current.handleRenameSubmit("New Name"));
    expect(mockRenameFolder).not.toHaveBeenCalled();

    await act(async () => await result.current.handleDeleteNoteSubmit());
    expect(mockDeleteNoteMutation.mutateAsync).not.toHaveBeenCalled();
  });
});

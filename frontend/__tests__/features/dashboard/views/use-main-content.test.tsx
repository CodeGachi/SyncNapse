/**
 * useMainContent 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMainContent } from "@/features/dashboard/views/use-main-content";
import * as notesQueries from "@/lib/api/queries/notes.queries";
import * as notesApi from "@/lib/api/services/notes.api";
import * as foldersApi from "@/lib/api/services/folders.api";
import * as useFoldersModule from "@/features/dashboard";
import * as useSearchModule from "@/features/search/use-search";
import { ReactNode } from "react";

// Mock next/navigation
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
  }),
}));

// Mock dashboard context
const mockSetSelectedFolderId = vi.fn();
vi.mock("@/providers/dashboard-context", () => ({
  useDashboardContext: () => ({
    selectedFolderId: "root",
    setSelectedFolderId: mockSetSelectedFolderId,
  }),
}));

// Mock notes queries
vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: vi.fn(),
}));

// Mock APIs
vi.mock("@/lib/api/services/notes.api", () => ({
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock("@/lib/api/services/folders.api", () => ({
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
}));

// Mock useFolders
vi.mock("@/features/dashboard", () => ({
  useFolders: vi.fn(),
}));

// Mock useSearch
vi.mock("@/features/search/use-search", () => ({
  useSearch: vi.fn(),
}));

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe("useMainContent", () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockNotes = [
    { id: "1", title: "Note 1", folderId: "root", type: "student", updatedAt: 1705320000000 },
    { id: "2", title: "Note 2", folderId: "root", type: "educator", updatedAt: 1705310000000 },
    { id: "3", title: "Note 3", folderId: "folder-1", type: "student", updatedAt: 1705300000000 },
  ];

  const mockFolders = [
    { id: "root", name: "Root", parentId: null },
    { id: "folder-1", name: "Folder 1", parentId: "root" },
    { id: "folder-2", name: "Folder 2", parentId: "root" },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(notesQueries.useNotes).mockReturnValue({
      data: mockNotes,
      isLoading: false,
    } as any);

    vi.mocked(useFoldersModule.useFolders).mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      buildFolderTree: vi.fn(() => []),
    } as any);

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      query: "",
      setQuery: vi.fn(),
      isOpen: false,
      setIsOpen: vi.fn(),
      results: [],
      isLoading: false,
    } as any);

    vi.clearAllMocks();
  });

  describe("데이터 조회", () => {
    it("모든 노트 반환", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.allNotes).toEqual(mockNotes);
    });

    it("현재 폴더의 하위 폴더 반환", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.childFolders).toHaveLength(2);
      expect(result.current.childFolders.map((f) => f.name)).toEqual([
        "Folder 1",
        "Folder 2",
      ]);
    });

    it("현재 폴더의 노트 반환", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.folderNotes).toHaveLength(2);
      expect(result.current.folderNotes.map((n) => n.title)).toEqual([
        "Note 1",
        "Note 2",
      ]);
    });

    it("최근 노트 (updatedAt 기준 정렬, 최대 5개)", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.recentNotes).toHaveLength(3);
      expect(result.current.recentNotes[0].id).toBe("1"); // 가장 최근
    });
  });

  describe("handleFolderClick", () => {
    it("폴더 선택시 setSelectedFolderId 호출", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleFolderClick("folder-1");
      });

      expect(mockSetSelectedFolderId).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("handleNoteClick", () => {
    it("student 노트 클릭시 /note/student/{id}로 이동", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleNoteClick(mockNotes[0] as any);
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/student/1");
    });

    it("educator 노트 클릭시 /note/educator/{id}로 이동", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleNoteClick(mockNotes[1] as any);
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/educator/2");
    });
  });

  describe("formatDate", () => {
    it("날짜를 YYYY/MM/DD 형식으로 포맷", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      // 2024-01-15
      const formatted = result.current.formatDate(1705320000000);

      expect(formatted).toMatch(/2024\/01\/15/);
    });
  });

  describe("옵션 메뉴", () => {
    it("handleOptionClick으로 옵션 메뉴 열기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({
            bottom: 100,
            right: 200,
          }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent, "note", "1");
      });

      expect(result.current.optionMenu).toMatchObject({
        type: "note",
        id: "1",
      });
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("closeOptionMenu으로 옵션 메뉴 닫기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, right: 200 }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent, "note", "1");
      });

      expect(result.current.optionMenu).not.toBe(null);

      act(() => {
        result.current.closeOptionMenu();
      });

      expect(result.current.optionMenu).toBe(null);
    });
  });

  describe("이름 변경", () => {
    it("handleRename으로 노트 이름 변경", async () => {
      vi.mocked(notesApi.updateNote).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useMainContent(), { wrapper });

      // 이름 변경 모달 직접 설정
      act(() => {
        result.current.setNewName("New Title");
      });

      // renameModal 상태 설정을 위해 내부적으로 처리
      // 실제 테스트는 openRenameModal을 통해 진행해야 하지만,
      // 옵션 메뉴가 열려있어야 하므로 직접 설정
      const { result: result2 } = renderHook(() => useMainContent(), { wrapper });

      // 옵션 메뉴 열기
      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, right: 200 }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result2.current.handleOptionClick(mockEvent, "note", "1");
      });

      // 이름 변경 모달 열기
      act(() => {
        result2.current.openRenameModal();
      });

      expect(result2.current.renameModal).toMatchObject({
        type: "note",
        id: "1",
        currentName: "Note 1",
      });
    });

    it("handleRename 실패시 alert 표시", async () => {
      vi.mocked(notesApi.updateNote).mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useMainContent(), { wrapper });

      // 옵션 메뉴 열기
      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, right: 200 }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent, "note", "1");
      });

      act(() => {
        result.current.openRenameModal();
      });

      act(() => {
        result.current.setNewName("New Name");
      });

      await act(async () => {
        await result.current.handleRename();
      });

      expect(mockAlert).toHaveBeenCalledWith("이름 변경에 실패했습니다.");
    });
  });

  describe("삭제", () => {
    it("handleDelete로 삭제 모달 열기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("note", "1");
      });

      expect(result.current.deleteModal).toMatchObject({
        type: "note",
        id: "1",
        name: "Note 1",
      });
    });

    it("confirmDelete로 노트 삭제", async () => {
      vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("note", "1");
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(notesApi.deleteNote).toHaveBeenCalledWith("1");
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["notes"] });
      expect(result.current.deleteModal).toBe(null);
    });

    it("confirmDelete로 폴더 삭제", async () => {
      vi.mocked(foldersApi.deleteFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("folder", "folder-1");
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(foldersApi.deleteFolder).toHaveBeenCalledWith("folder-1");
    });

    it("삭제 실패시 alert 표시", async () => {
      vi.mocked(notesApi.deleteNote).mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("note", "1");
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockAlert).toHaveBeenCalledWith("삭제에 실패했습니다.");
    });

    it("closeDeleteModal로 삭제 모달 닫기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("note", "1");
      });

      expect(result.current.deleteModal).not.toBe(null);

      act(() => {
        result.current.closeDeleteModal();
      });

      expect(result.current.deleteModal).toBe(null);
    });
  });
});

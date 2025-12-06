/**
 * use-main-content 훅 테스트
 * 대시보드 메인 컨텐츠 비즈니스 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMainContent } from "@/features/dashboard/views/use-main-content";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock router
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock context
const mockSelectedFolderId = vi.fn(() => "folder-1");
const mockSetSelectedFolderId = vi.fn();

vi.mock("@/providers/dashboard-context", () => ({
  useDashboardContext: () => ({
    selectedFolderId: mockSelectedFolderId(),
    setSelectedFolderId: mockSetSelectedFolderId,
  }),
}));

// Mock folders hook
const mockFolders = vi.fn(() => [
  { id: "root", name: "Root", parentId: null },
  { id: "folder-1", name: "Work", parentId: "root" },
  { id: "folder-2", name: "Personal", parentId: "root" },
]);
const mockBuildFolderTree = vi.fn();

vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({
    folders: mockFolders(),
    isLoading: false,
    buildFolderTree: mockBuildFolderTree,
  }),
}));

// Mock notes query
const mockNotes = vi.fn(() => [
  {
    id: "note-1",
    title: "Note 1",
    folderId: "folder-1",
    type: "student",
    createdAt: Date.now() - 1000,
    updatedAt: Date.now(),
  },
  {
    id: "note-2",
    title: "Note 2",
    folderId: "folder-1",
    type: "educator",
    createdAt: Date.now() - 2000,
    updatedAt: Date.now() - 1000,
  },
]);

vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: () => ({
    data: mockNotes(),
    isLoading: false,
  }),
}));

// Mock search hook
const mockSetSearchQuery = vi.fn();
const mockSetIsSearchOpen = vi.fn();

vi.mock("@/features/search/use-search", () => ({
  useSearch: () => ({
    query: "",
    setQuery: mockSetSearchQuery,
    isOpen: false,
    setIsOpen: mockSetIsSearchOpen,
    results: [],
    isLoading: false,
  }),
}));

// Mock APIs
const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockRenameFolder = vi.fn();
const mockDeleteFolder = vi.fn();
const mockMoveFolder = vi.fn();

vi.mock("@/lib/api/services/notes.api", () => ({
  updateNote: (...args: unknown[]) => mockUpdateNote(...args),
  deleteNote: (id: string) => mockDeleteNote(id),
}));

const mockFetchFolderPath = vi.fn(() => Promise.resolve([
  { id: "root", name: "Root", parentId: null },
  { id: "folder-1", name: "Work", parentId: "root" },
]));

vi.mock("@/lib/api/services/folders.api", () => ({
  renameFolder: (...args: unknown[]) => mockRenameFolder(...args),
  deleteFolder: (id: string) => mockDeleteFolder(id),
  moveFolder: (...args: unknown[]) => mockMoveFolder(...args),
  fetchFolderPath: (id: string) => mockFetchFolderPath(id),
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

describe("useMainContent", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockSelectedFolderId.mockReturnValue("folder-1");
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.optionMenu).toBeNull();
      expect(result.current.renameModal).toBeNull();
      expect(result.current.moveModal).toBeNull();
      expect(result.current.deleteModal).toBeNull();
    });

    it("폴더 및 노트 데이터 반환", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.folders).toHaveLength(3);
      expect(result.current.allNotes).toHaveLength(2);
    });
  });

  describe("폴더 필터링", () => {
    it("childFolders - 현재 폴더의 하위 폴더 반환", () => {
      mockSelectedFolderId.mockReturnValue("root");

      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.childFolders).toHaveLength(2);
      expect(result.current.childFolders[0].name).toBe("Work");
    });

    it("folderNotes - 현재 폴더의 노트 반환", () => {
      mockSelectedFolderId.mockReturnValue("folder-1");

      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.folderNotes).toHaveLength(2);
    });
  });

  describe("recentNotes", () => {
    it("최근 노트 5개까지 반환", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.recentNotes.length).toBeLessThanOrEqual(5);
    });

    it("updatedAt 기준 정렬", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      expect(result.current.recentNotes[0].id).toBe("note-1"); // 가장 최근
    });
  });

  describe("handleFolderClick", () => {
    it("폴더 선택", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleFolderClick("folder-2");
      });

      expect(mockSetSelectedFolderId).toHaveBeenCalledWith("folder-2");
    });
  });

  describe("handleNoteClick", () => {
    it("노트 클릭시 해당 페이지로 이동", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleNoteClick({
          id: "note-1",
          title: "Test",
          type: "student",
        } as any);
      });

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-1");
    });

    it("educator 타입 노트", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleNoteClick({
          id: "note-2",
          title: "Test",
          type: "educator",
        } as any);
      });

      expect(mockPush).toHaveBeenCalledWith("/note/educator/note-2");
    });
  });

  describe("옵션 메뉴", () => {
    it("handleOptionClick - 옵션 메뉴 열기", () => {
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
        result.current.handleOptionClick(mockEvent, "note", "note-1");
      });

      expect(result.current.optionMenu).toEqual({
        type: "note",
        id: "note-1",
        position: { top: 104, left: 40 },
      });
    });

    it("closeOptionMenu - 옵션 메뉴 닫기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, right: 200 }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent, "note", "note-1");
      });

      act(() => {
        result.current.closeOptionMenu();
      });

      expect(result.current.optionMenu).toBeNull();
    });
  });

  describe("이름 변경", () => {
    it("openRenameModal - 노트 이름 변경 모달 열기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      // 먼저 옵션 메뉴 열기
      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, right: 200 }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent, "note", "note-1");
      });

      act(() => {
        result.current.openRenameModal();
      });

      expect(result.current.renameModal).toEqual({
        type: "note",
        id: "note-1",
        currentName: "Note 1",
      });
    });

    it("handleRename - 노트 이름 변경", async () => {
      mockUpdateNote.mockResolvedValue({});

      const { result } = renderHook(() => useMainContent(), { wrapper });

      // 옵션 메뉴 열기
      const mockEvent = {
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, right: 200 }),
        },
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleOptionClick(mockEvent, "note", "note-1");
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

      expect(mockUpdateNote).toHaveBeenCalledWith("note-1", { title: "New Name" });
      expect(result.current.renameModal).toBeNull();
    });
  });

  describe("삭제", () => {
    it("handleDelete - 삭제 모달 열기", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("note", "note-1");
      });

      expect(result.current.deleteModal).toEqual({
        type: "note",
        id: "note-1",
        name: "Note 1",
      });
    });

    it("confirmDelete - 노트 삭제", async () => {
      mockDeleteNote.mockResolvedValue({});

      const { result } = renderHook(() => useMainContent(), { wrapper });

      act(() => {
        result.current.handleDelete("note", "note-1");
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockDeleteNote).toHaveBeenCalledWith("note-1");
      expect(result.current.deleteModal).toBeNull();
    });
  });

  describe("formatDate", () => {
    it("날짜를 YYYY/MM/DD 형식으로 포맷팅", () => {
      const { result } = renderHook(() => useMainContent(), { wrapper });

      const formatted = result.current.formatDate("2024-01-15T00:00:00Z");

      expect(formatted).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });
  });

  describe("폴더 경로 (브레드크럼)", () => {
    it("selectedFolderId 변경 시 폴더 경로 조회", async () => {
      mockSelectedFolderId.mockReturnValue("folder-1");

      const { result } = renderHook(() => useMainContent(), { wrapper });

      // 초기 로딩 상태
      expect(result.current.isPathLoading).toBe(true);

      // 경로 로딩 완료 대기
      await waitFor(() => {
        expect(result.current.isPathLoading).toBe(false);
      });

      expect(mockFetchFolderPath).toHaveBeenCalledWith("folder-1");
      expect(result.current.folderPath).toHaveLength(2);
      expect(result.current.folderPath[0].name).toBe("Root");
      expect(result.current.folderPath[1].name).toBe("Work");
    });

    it("selectedFolderId가 null이면 빈 경로 반환", async () => {
      mockSelectedFolderId.mockReturnValue(null);

      const { result } = renderHook(() => useMainContent(), { wrapper });

      await waitFor(() => {
        expect(result.current.isPathLoading).toBe(false);
      });

      expect(result.current.folderPath).toHaveLength(0);
    });

    it("경로 조회 실패 시 빈 경로 반환", async () => {
      mockFetchFolderPath.mockRejectedValueOnce(new Error("Failed"));
      mockSelectedFolderId.mockReturnValue("folder-1");

      const { result } = renderHook(() => useMainContent(), { wrapper });

      await waitFor(() => {
        expect(result.current.isPathLoading).toBe(false);
      });

      expect(result.current.folderPath).toHaveLength(0);
    });
  });
});

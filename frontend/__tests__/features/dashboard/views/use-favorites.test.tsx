/**
 * useFavorites 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFavorites } from "@/features/dashboard/views/use-favorites";
import * as notesQueries from "@/lib/api/queries/notes.queries";
import * as notesApi from "@/lib/api/services/notes.api";
import * as useFoldersModule from "@/features/dashboard";
import { ReactNode } from "react";

// Mock next/navigation
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
  }),
}));

// Mock notes queries
vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: vi.fn(),
}));

// Mock notes API
vi.mock("@/lib/api/services/notes.api", () => ({
  updateNote: vi.fn(),
}));

// Mock useFolders
vi.mock("@/features/dashboard", () => ({
  useFolders: vi.fn(),
}));

describe("useFavorites", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockNotes = [
    { id: "1", title: "Favorite Note 1", is_favorite: true, folderId: "folder-1", type: "student" },
    { id: "2", title: "Favorite Note 2", is_favorite: true, folderId: "folder-2", type: "educator" },
    { id: "3", title: "Regular Note", is_favorite: false, folderId: "folder-1", type: "student" },
  ];

  const mockFolders = [
    { id: "folder-1", name: "My Folder", parentId: null },
    { id: "folder-2", name: "Other Folder", parentId: null },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useFoldersModule.useFolders).mockReturnValue({
      folders: mockFolders,
    } as any);

    vi.clearAllMocks();
  });

  describe("즐겨찾기 필터링", () => {
    it("즐겨찾기 노트만 필터링", () => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.filteredNotes).toHaveLength(2);
      expect(result.current.filteredNotes.every((n) => n.is_favorite)).toBe(true);
    });

    it("로딩 중일 때 isLoading이 true", () => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("검색 필터링", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
      } as any);
    });

    it("검색어로 즐겨찾기 노트 필터링", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.setSearchQuery("Note 1");
      });

      expect(result.current.filteredNotes).toHaveLength(1);
      expect(result.current.filteredNotes[0].title).toBe("Favorite Note 1");
    });

    it("대소문자 구분 없이 검색", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.setSearchQuery("FAVORITE");
      });

      expect(result.current.filteredNotes).toHaveLength(2);
    });

    it("빈 검색어면 모든 즐겨찾기 반환", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.setSearchQuery("   ");
      });

      expect(result.current.filteredNotes).toHaveLength(2);
    });
  });

  describe("handleNoteClick", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
      } as any);
    });

    it("student 노트 클릭시 /note/student/{id}로 이동", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.handleNoteClick(mockNotes[0] as any);
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/student/1");
    });

    it("educator 노트 클릭시 /note/educator/{id}로 이동", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      act(() => {
        result.current.handleNoteClick(mockNotes[1] as any);
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/educator/2");
    });
  });

  describe("handleToggleFavorite", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
      } as any);
    });

    it("즐겨찾기 토글 호출", async () => {
      vi.mocked(notesApi.updateNote).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFavorites(), { wrapper });

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      await act(async () => {
        await result.current.handleToggleFavorite(mockEvent, mockNotes[0] as any);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(notesApi.updateNote).toHaveBeenCalledWith("1", { is_favorite: false });
    });

    it("이벤트 전파 중지", async () => {
      vi.mocked(notesApi.updateNote).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFavorites(), { wrapper });

      const mockEvent = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      await act(async () => {
        await result.current.handleToggleFavorite(mockEvent, mockNotes[0] as any);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe("getFolderName", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
      } as any);
    });

    it("폴더 ID로 폴더 이름 반환", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.getFolderName("folder-1")).toBe("My Folder");
      expect(result.current.getFolderName("folder-2")).toBe("Other Folder");
    });

    it("폴더 ID가 null이면 '루트' 반환", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.getFolderName(null)).toBe("루트");
    });

    it("존재하지 않는 폴더 ID면 '알 수 없음' 반환", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.getFolderName("nonexistent")).toBe("알 수 없음");
    });
  });

  describe("formatDate", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: [],
        isLoading: false,
      } as any);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("오늘 날짜 표시", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.formatDate("2024-01-15T10:00:00Z")).toBe("오늘");
    });

    it("어제 날짜 표시", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.formatDate("2024-01-14T10:00:00Z")).toBe("어제");
    });

    it("일주일 이내 날짜 표시", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.formatDate("2024-01-12T10:00:00Z")).toBe("3일 전");
    });

    it("일주일 이상 지난 날짜는 전체 날짜 표시", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      const formatted = result.current.formatDate("2024-01-01T10:00:00Z");
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/01/);
    });
  });
});

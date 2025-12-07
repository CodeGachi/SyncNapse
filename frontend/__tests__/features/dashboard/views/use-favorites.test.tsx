/**
 * useFavorites 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFavorites } from "@/features/dashboard/views/use-favorites";
import * as notesQueries from "@/lib/api/queries/notes.queries";
import * as notesApi from "@/lib/api/services/notes.api";
import * as useFoldersModule from "@/features/dashboard";
import { ReactNode } from "react";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn() }),
}));
vi.mock("@/lib/api/queries/notes.queries", () => ({ useNotes: vi.fn() }));
vi.mock("@/lib/api/services/notes.api", () => ({ updateNote: vi.fn() }));
vi.mock("@/features/dashboard", () => ({ useFolders: vi.fn() }));

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

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

beforeEach(() => {
  queryClient.clear();
  vi.mocked(useFoldersModule.useFolders).mockReturnValue({ folders: mockFolders } as any);
  vi.mocked(notesQueries.useNotes).mockReturnValue({
    data: mockNotes,
    isLoading: false,
  } as any);
  vi.clearAllMocks();
});

describe("useFavorites", () => {
  it("즐겨찾기 필터링 및 로딩 상태", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    expect(result.current.filteredNotes).toHaveLength(2);
    expect(result.current.filteredNotes.every((n) => n.is_favorite)).toBe(true);

    vi.mocked(notesQueries.useNotes).mockReturnValue({ data: undefined, isLoading: true } as any);
    const { result: loadingResult } = renderHook(() => useFavorites(), { wrapper });
    expect(loadingResult.current.isLoading).toBe(true);
  });

  it("검색 필터링", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => result.current.setSearchQuery("Note 1"));
    expect(result.current.filteredNotes).toHaveLength(1);

    act(() => result.current.setSearchQuery("FAVORITE"));
    expect(result.current.filteredNotes).toHaveLength(2);

    act(() => result.current.setSearchQuery("   "));
    expect(result.current.filteredNotes).toHaveLength(2);
  });

  it("노트 타입별 라우팅", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => result.current.handleNoteClick(mockNotes[0] as any));
    expect(mockRouterPush).toHaveBeenLastCalledWith("/note/student/1");

    act(() => result.current.handleNoteClick(mockNotes[1] as any));
    expect(mockRouterPush).toHaveBeenLastCalledWith("/note/educator/2");
  });

  it("즐겨찾기 토글", async () => {
    vi.mocked(notesApi.updateNote).mockResolvedValue(undefined as any);
    const { result } = renderHook(() => useFavorites(), { wrapper });

    const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
    await act(async () => {
      await result.current.handleToggleFavorite(mockEvent, mockNotes[0] as any);
    });

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(notesApi.updateNote).toHaveBeenCalledWith("1", { is_favorite: false });
  });

  it("폴더 이름 조회", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.getFolderName("folder-1")).toBe("My Folder");
    expect(result.current.getFolderName(null)).toBe("루트");
    expect(result.current.getFolderName("nonexistent")).toBe("알 수 없음");
  });

  describe("날짜 포맷팅", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({ data: [], isLoading: false } as any);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("상대적 날짜 표시", () => {
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.formatDate("2024-01-15T10:00:00Z")).toBe("오늘");
      expect(result.current.formatDate("2024-01-14T10:00:00Z")).toBe("어제");
      expect(result.current.formatDate("2024-01-12T10:00:00Z")).toBe("3일 전");
      expect(result.current.formatDate("2024-01-01T10:00:00Z")).toMatch(/2024/);
    });
  });
});

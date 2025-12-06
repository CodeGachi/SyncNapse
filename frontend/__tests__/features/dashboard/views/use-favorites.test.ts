/**
 * use-favorites 테스트
 * 즐겨찾기 페이지 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFavorites } from "@/features/dashboard/views/use-favorites";

// Mock dependencies
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: vi.fn(),
}));

vi.mock("@/lib/api/services/notes.api", () => ({
  updateNote: vi.fn(),
}));

vi.mock("@/features/dashboard", () => ({
  useFolders: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { useNotes } from "@/lib/api/queries/notes.queries";
import { updateNote } from "@/lib/api/services/notes.api";
import { useFolders } from "@/features/dashboard";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockNotes = [
  { id: "note-1", title: "Favorite Note 1", is_favorite: true, type: "student", folderId: "folder-1", updatedAt: Date.now() },
  { id: "note-2", title: "Favorite Note 2", is_favorite: true, type: "educator", folderId: "folder-2", updatedAt: Date.now() - 86400000 },
  { id: "note-3", title: "Regular Note", is_favorite: false, type: "student", folderId: null, updatedAt: Date.now() },
];

const mockFolders = [
  { id: "folder-1", name: "Work" },
  { id: "folder-2", name: "Personal" },
];

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));

    (useNotes as any).mockReturnValue({
      data: mockNotes,
      isLoading: false,
    });

    (useFolders as any).mockReturnValue({
      folders: mockFolders,
    });

    (updateNote as any).mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("즐겨찾기 필터링", () => {
    it("즐겨찾기 노트만 필터링", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.filteredNotes).toHaveLength(2);
      expect(result.current.filteredNotes.every((n) => n.is_favorite)).toBe(true);
    });

    it("검색어로 필터링", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearchQuery("Note 1");
      });

      expect(result.current.filteredNotes).toHaveLength(1);
      expect(result.current.filteredNotes[0].title).toBe("Favorite Note 1");
    });

    it("대소문자 구분 없이 검색", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearchQuery("FAVORITE");
      });

      expect(result.current.filteredNotes).toHaveLength(2);
    });

    it("빈 검색어는 모든 즐겨찾기 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearchQuery("   ");
      });

      expect(result.current.filteredNotes).toHaveLength(2);
    });
  });

  describe("폴더 이름 조회", () => {
    it("폴더 이름 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getFolderName("folder-1")).toBe("Work");
      expect(result.current.getFolderName("folder-2")).toBe("Personal");
    });

    it("folderId가 null이면 '루트' 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getFolderName(null)).toBe("루트");
    });

    it("존재하지 않는 폴더는 '알 수 없음' 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.getFolderName("non-existent")).toBe("알 수 없음");
    });
  });

  describe("날짜 포맷팅", () => {
    it("오늘 날짜는 '오늘' 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const today = new Date("2024-01-15T10:00:00Z").getTime();
      expect(result.current.formatDate(today)).toBe("오늘");
    });

    it("어제 날짜는 '어제' 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const yesterday = new Date("2024-01-14T10:00:00Z").getTime();
      expect(result.current.formatDate(yesterday)).toBe("어제");
    });

    it("일주일 이내는 'N일 전' 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const threeDaysAgo = new Date("2024-01-12T10:00:00Z").getTime();
      expect(result.current.formatDate(threeDaysAgo)).toBe("3일 전");
    });

    it("일주일 이상은 날짜 형식 반환", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const tenDaysAgo = new Date("2024-01-05T10:00:00Z").getTime();
      const formatted = result.current.formatDate(tenDaysAgo);
      expect(formatted).toMatch(/2024/);
    });
  });

  describe("노트 클릭", () => {
    it("student 노트 클릭", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const note = { id: "note-1", type: "student" } as any;
      result.current.handleNoteClick(note);

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-1");
    });

    it("educator 노트 클릭", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const note = { id: "note-2", type: "educator" } as any;
      result.current.handleNoteClick(note);

      expect(mockPush).toHaveBeenCalledWith("/note/educator/note-2");
    });

    it("타입 없으면 student 기본값", () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const note = { id: "note-3" } as any;
      result.current.handleNoteClick(note);

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-3");
    });
  });

  describe("즐겨찾기 토글", () => {
    it("즐겨찾기 해제", async () => {
      (updateNote as any).mockResolvedValue({});

      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const mockEvent = { stopPropagation: vi.fn() } as any;
      const note = { id: "note-1", is_favorite: true } as any;

      await act(async () => {
        await result.current.handleToggleFavorite(mockEvent, note);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(updateNote).toHaveBeenCalledWith("note-1", { is_favorite: false });
    });

    it("이벤트 전파 중지", async () => {
      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      const mockEvent = { stopPropagation: vi.fn() } as any;
      const note = { id: "note-1", is_favorite: true } as any;

      await act(async () => {
        await result.current.handleToggleFavorite(mockEvent, note);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe("로딩 상태", () => {
    it("로딩 중 상태 반환", () => {
      (useNotes as any).mockReturnValue({
        data: [],
        isLoading: true,
      });

      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });
});

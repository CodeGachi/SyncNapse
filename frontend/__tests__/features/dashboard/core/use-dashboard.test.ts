/**
 * use-dashboard 테스트
 * 대시보드 기능 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboard } from "@/features/dashboard/core/use-dashboard";

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

vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useCreateNote: vi.fn(),
}));

import { useNotes } from "@/lib/api/queries/notes.queries";
import { useCreateNote } from "@/lib/api/mutations/notes.mutations";

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

describe("useDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useNotes as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    (useCreateNote as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  describe("노트 목록 조회", () => {
    it("노트 목록 반환", () => {
      const mockNotes = [
        { id: "note-1", title: "Note 1", type: "student" },
        { id: "note-2", title: "Note 2", type: "educator" },
      ];
      (useNotes as any).mockReturnValue({
        data: mockNotes,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.notes).toEqual(mockNotes);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("로딩 상태", () => {
      (useNotes as any).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("에러 상태", () => {
      const mockError = new Error("Failed to load notes");
      (useNotes as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: mockError,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe("노트 생성", () => {
    it("student 노트 생성 후 페이지 이동", async () => {
      const mockMutate = vi.fn((data, options) => {
        options.onSuccess({ id: "new-note", type: "student" });
      });
      (useCreateNote as any).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "New Note",
          location: "folder-1",
          type: "student",
        });
      });

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Note",
          folderId: "folder-1",
          type: "student",
        }),
        expect.any(Object)
      );
      expect(mockPush).toHaveBeenCalledWith("/note/student/new-note");
    });

    it("educator 노트 생성 후 페이지 이동", async () => {
      const mockMutate = vi.fn((data, options) => {
        options.onSuccess({ id: "edu-note", type: "educator" });
      });
      (useCreateNote as any).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "Educator Note",
          type: "educator",
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/note/educator/edu-note");
    });

    it("location 없으면 root 폴더 사용", async () => {
      const mockMutate = vi.fn((data, options) => {
        options.onSuccess({ id: "note-1", type: "student" });
      });
      (useCreateNote as any).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "Note without location",
          type: "student",
        });
      });

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          folderId: "root",
        }),
        expect.any(Object)
      );
    });

    it("생성 실패 시 reject", async () => {
      const mockError = new Error("Creation failed");
      const mockMutate = vi.fn((data, options) => {
        options.onError(mockError);
      });
      (useCreateNote as any).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.handleCreateNote({
          title: "Fail Note",
          type: "student",
        })
      ).rejects.toThrow("Creation failed");
    });

    it("isCreating 상태", () => {
      (useCreateNote as any).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isCreating).toBe(true);
    });
  });

  describe("노트 클릭", () => {
    it("student 노트 클릭 시 student 페이지로 이동", () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      result.current.handleNoteClick("note-123", "student");

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-123");
    });

    it("educator 노트 클릭 시 educator 페이지로 이동", () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      result.current.handleNoteClick("note-456", "educator");

      expect(mockPush).toHaveBeenCalledWith("/note/educator/note-456");
    });

    it("타입 미지정 시 student 기본값", () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      result.current.handleNoteClick("note-789");

      expect(mockPush).toHaveBeenCalledWith("/note/student/note-789");
    });
  });
});

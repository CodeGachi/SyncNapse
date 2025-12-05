/**
 * useDashboard 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboard } from "@/features/dashboard/core/use-dashboard";
import * as notesQueries from "@/lib/api/queries/notes.queries";
import * as notesMutations from "@/lib/api/mutations/notes.mutations";
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

// Mock notes mutations
vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useCreateNote: vi.fn(),
}));

describe("useDashboard", () => {
  let queryClient: QueryClient;
  let createNoteMutateFn: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    createNoteMutateFn = vi.fn();

    vi.mocked(notesMutations.useCreateNote).mockReturnValue({
      mutate: createNoteMutateFn,
      isPending: false,
    } as any);

    vi.clearAllMocks();
  });

  describe("노트 목록 조회", () => {
    it("로딩 중일 때 isLoading이 true", () => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboard(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.notes).toEqual([]);
    });

    it("노트 목록 반환", () => {
      const mockNotes = [
        { id: "1", title: "Note 1", type: "student" },
        { id: "2", title: "Note 2", type: "educator" },
      ];

      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboard(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.notes).toEqual(mockNotes);
    });

    it("에러 반환", () => {
      const mockError = new Error("Failed to fetch");

      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      const { result } = renderHook(() => useDashboard(), { wrapper });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe("handleNoteClick", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);
    });

    it("student 노트 클릭시 /note/student/{id}로 이동", () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });

      act(() => {
        result.current.handleNoteClick("note-123", "student");
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/student/note-123");
    });

    it("educator 노트 클릭시 /note/educator/{id}로 이동", () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });

      act(() => {
        result.current.handleNoteClick("note-456", "educator");
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/educator/note-456");
    });

    it("타입 미지정시 기본값 student로 이동", () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });

      act(() => {
        result.current.handleNoteClick("note-789");
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/student/note-789");
    });
  });

  describe("handleCreateNote", () => {
    beforeEach(() => {
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);
    });

    it("노트 생성시 mutation 호출", async () => {
      const newNote = { id: "new-note", title: "New Note", type: "student" };

      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess(newNote);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "New Note",
          location: "folder-1",
          files: [],
          type: "student",
        });
      });

      expect(createNoteMutateFn).toHaveBeenCalledWith(
        {
          title: "New Note",
          folderId: "folder-1",
          files: [],
          type: "student",
        },
        expect.any(Object)
      );
    });

    it("student 노트 생성 성공시 /note/student/{id}로 이동", async () => {
      const newNote = { id: "new-student", title: "Student Note", type: "student" };

      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess(newNote);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "Student Note",
          type: "student",
        });
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/student/new-student");
    });

    it("educator 노트 생성 성공시 /note/educator/{id}로 이동", async () => {
      const newNote = { id: "new-educator", title: "Educator Note", type: "educator" };

      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess(newNote);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "Educator Note",
          type: "educator",
        });
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/educator/new-educator");
    });

    it("노트 타입 미지정시 student로 처리", async () => {
      const newNote = { id: "new-default", title: "Default Note" }; // type 없음

      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess(newNote);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "Default Note",
        } as any);
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/note/student/new-default");
    });

    it("location이 없으면 root로 설정", async () => {
      const newNote = { id: "new-note", title: "Note", type: "student" };

      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess(newNote);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await act(async () => {
        await result.current.handleCreateNote({
          title: "Note",
          type: "student",
          // location 없음
        } as any);
      });

      expect(createNoteMutateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          folderId: "root",
        }),
        expect.any(Object)
      );
    });

    it("노트 생성 실패시 에러 reject", async () => {
      const error = new Error("Creation failed");

      createNoteMutateFn.mockImplementation((data, options) => {
        options.onError(error);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await expect(
        result.current.handleCreateNote({
          title: "Failing Note",
          type: "student",
        })
      ).rejects.toThrow("Creation failed");
    });

    it("isCreating 상태 반환", () => {
      vi.mocked(notesMutations.useCreateNote).mockReturnValue({
        mutate: createNoteMutateFn,
        isPending: true,
      } as any);

      const { result } = renderHook(() => useDashboard(), { wrapper });

      expect(result.current.isCreating).toBe(true);
    });
  });
});

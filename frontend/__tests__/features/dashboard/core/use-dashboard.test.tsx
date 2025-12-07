/**
 * useDashboard 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboard } from "@/features/dashboard/core/use-dashboard";
import * as notesQueries from "@/lib/api/queries/notes.queries";
import * as notesMutations from "@/lib/api/mutations/notes.mutations";
import { ReactNode } from "react";

// Mock 설정 (파일 상단에서 한 번만)
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
  }),
}));

vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: vi.fn(),
}));

vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useCreateNote: vi.fn(),
}));

// 공유 QueryClient (재사용)
let queryClient: QueryClient;
let createNoteMutateFn: ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// 기본 mock 반환값 설정 함수
const setupDefaultMocks = () => {
  vi.mocked(notesQueries.useNotes).mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  } as any);

  vi.mocked(notesMutations.useCreateNote).mockReturnValue({
    mutate: createNoteMutateFn,
    isPending: false,
  } as any);
};

beforeAll(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  createNoteMutateFn = vi.fn();
});

beforeEach(() => {
  queryClient.clear();
  createNoteMutateFn.mockReset();
  mockRouterPush.mockClear();
  setupDefaultMocks();
});

describe("useDashboard", () => {
  describe("노트 목록 조회", () => {
    it("로딩/데이터/에러 상태 반환", () => {
      // 로딩 상태
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { result: loadingResult } = renderHook(() => useDashboard(), { wrapper });
      expect(loadingResult.current.isLoading).toBe(true);
      expect(loadingResult.current.notes).toEqual([]);

      // 데이터 반환
      const mockNotes = [
        { id: "1", title: "Note 1", type: "student" },
        { id: "2", title: "Note 2", type: "educator" },
      ];
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: mockNotes,
        isLoading: false,
        error: null,
      } as any);

      const { result: dataResult } = renderHook(() => useDashboard(), { wrapper });
      expect(dataResult.current.isLoading).toBe(false);
      expect(dataResult.current.notes).toEqual(mockNotes);

      // 에러 반환
      const mockError = new Error("Failed to fetch");
      vi.mocked(notesQueries.useNotes).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      const { result: errorResult } = renderHook(() => useDashboard(), { wrapper });
      expect(errorResult.current.error).toBe(mockError);
    });
  });

  describe("handleNoteClick", () => {
    it("노트 타입별 라우팅", () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });

      // student 타입
      act(() => result.current.handleNoteClick("note-1", "student"));
      expect(mockRouterPush).toHaveBeenLastCalledWith("/note/student/note-1");

      // educator 타입
      act(() => result.current.handleNoteClick("note-2", "educator"));
      expect(mockRouterPush).toHaveBeenLastCalledWith("/note/educator/note-2");

      // 기본값 (student)
      act(() => result.current.handleNoteClick("note-3"));
      expect(mockRouterPush).toHaveBeenLastCalledWith("/note/student/note-3");
    });
  });

  describe("handleCreateNote", () => {
    it("노트 생성 및 타입별 라우팅", async () => {
      const { result } = renderHook(() => useDashboard(), { wrapper });

      // student 노트 생성
      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess({ id: "new-1", title: "Test", type: "student" });
      });

      await act(async () => {
        await result.current.handleCreateNote({ title: "Test", type: "student" });
      });

      expect(createNoteMutateFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Test", type: "student", folderId: "root" }),
        expect.any(Object)
      );
      expect(mockRouterPush).toHaveBeenLastCalledWith("/note/student/new-1");

      // educator 노트 생성
      createNoteMutateFn.mockImplementation((data, options) => {
        options.onSuccess({ id: "new-2", title: "Test", type: "educator" });
      });

      await act(async () => {
        await result.current.handleCreateNote({ title: "Test", type: "educator", location: "folder-1" });
      });

      expect(createNoteMutateFn).toHaveBeenLastCalledWith(
        expect.objectContaining({ folderId: "folder-1" }),
        expect.any(Object)
      );
      expect(mockRouterPush).toHaveBeenLastCalledWith("/note/educator/new-2");
    });

    it("생성 실패시 에러 reject", async () => {
      const error = new Error("Creation failed");
      createNoteMutateFn.mockImplementation((data, options) => {
        options.onError(error);
      });

      const { result } = renderHook(() => useDashboard(), { wrapper });

      await expect(
        result.current.handleCreateNote({ title: "Failing", type: "student" })
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

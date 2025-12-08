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

const mockRouterPush = vi.fn();
vi.mock("@/lib/api/mutations/notes.mutations", () => ({ useCreateNote: vi.fn() }));

let queryClient: QueryClient;
let createNoteMutateFn: ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  createNoteMutateFn = vi.fn();
});

beforeEach(() => {
  queryClient.clear();
  createNoteMutateFn.mockReset();
  mockRouterPush.mockClear();
  vi.mocked(notesQueries.useNotes).mockReturnValue({ data: [], isLoading: false, error: null } as any);
  vi.mocked(notesMutations.useCreateNote).mockReturnValue({ mutate: createNoteMutateFn, isPending: false } as any);
});

describe("useDashboard", () => {
  it("로딩/데이터/에러 상태 반환", () => {
    vi.mocked(notesQueries.useNotes).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    expect(renderHook(() => useDashboard(), { wrapper }).result.current.isLoading).toBe(true);

    const mockNotes = [{ id: "1", title: "Note 1", type: "student" }];
    vi.mocked(notesQueries.useNotes).mockReturnValue({ data: mockNotes, isLoading: false, error: null } as any);
    expect(renderHook(() => useDashboard(), { wrapper }).result.current.notes).toEqual(mockNotes);

    const mockError = new Error("Failed");
    vi.mocked(notesQueries.useNotes).mockReturnValue({ data: undefined, isLoading: false, error: mockError } as any);
    expect(renderHook(() => useDashboard(), { wrapper }).result.current.error).toBe(mockError);
  });

  it("handleNoteClick - 노트 타입별 라우팅", () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });
    act(() => result.current.handleNoteClick("note-1", "student"));
    expect(mockRouterPush).toHaveBeenLastCalledWith("/note/student/note-1");
    act(() => result.current.handleNoteClick("note-2", "educator"));
    expect(mockRouterPush).toHaveBeenLastCalledWith("/note/educator/note-2");
  });

  it("handleCreateNote - 노트 생성 및 라우팅", async () => {
    createNoteMutateFn.mockImplementation((data, opts) => opts.onSuccess({ id: "new-1", type: "student" }));
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await act(async () => await result.current.handleCreateNote({ title: "Test", type: "student" }));
    expect(createNoteMutateFn).toHaveBeenCalledWith(expect.objectContaining({ title: "Test", type: "student" }), expect.any(Object));
    expect(mockRouterPush).toHaveBeenLastCalledWith("/note/student/new-1");

    // 생성 실패시 에러
    createNoteMutateFn.mockImplementation((data, opts) => opts.onError(new Error("Failed")));
    await expect(result.current.handleCreateNote({ title: "Fail", type: "student" })).rejects.toThrow("Failed");
  });
});

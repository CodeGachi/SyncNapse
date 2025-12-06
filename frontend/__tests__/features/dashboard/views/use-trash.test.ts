/**
 * use-trash 테스트
 * 휴지통 페이지 훅
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTrash } from "@/features/dashboard/views/use-trash";

// Mock dependencies
const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("@/lib/api/services/notes.api", () => ({
  fetchTrashedNotes: vi.fn(),
  restoreNote: vi.fn(),
  permanentlyDeleteNote: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  fetchTrashedNotes,
  restoreNote,
  permanentlyDeleteNote,
} from "@/lib/api/services/notes.api";

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

const mockTrashedNotes = [
  { id: "note-1", title: "Deleted Note 1", deletedAt: "2024-01-14T10:00:00Z" },
  { id: "note-2", title: "Deleted Note 2", deletedAt: "2024-01-13T10:00:00Z" },
];

describe("useTrash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));

    (fetchTrashedNotes as any).mockResolvedValue(mockTrashedNotes);
    global.confirm = vi.fn(() => true);
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 로드", () => {
    it("삭제된 노트 목록 로드", async () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.trashedNotes).toEqual(mockTrashedNotes);
      expect(fetchTrashedNotes).toHaveBeenCalled();
    });

    it("로드 실패 시 alert", async () => {
      (fetchTrashedNotes as any).mockRejectedValue(new Error("Load failed"));

      renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("휴지통 로드에 실패했습니다.");
      });
    });
  });

  describe("노트 복구", () => {
    it("복구 확인 후 복구 실행", async () => {
      (restoreNote as any).mockResolvedValue({ title: "Restored Note" });

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleRestore("note-1", "Deleted Note 1");
      });

      expect(global.confirm).toHaveBeenCalled();
      expect(restoreNote).toHaveBeenCalledWith("note-1");
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining("복구되었습니다")
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["notes"] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("복구 취소", async () => {
      (global.confirm as any).mockReturnValue(false);

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleRestore("note-1", "Deleted Note 1");
      });

      expect(restoreNote).not.toHaveBeenCalled();
    });

    it("복구 실패 시 alert", async () => {
      (restoreNote as any).mockRejectedValue(new Error("Restore failed"));

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleRestore("note-1", "Deleted Note 1");
      });

      expect(global.alert).toHaveBeenCalledWith("복구에 실패했습니다.");
    });

    it("복구 중 상태 표시", async () => {
      let resolveRestore: any;
      (restoreNote as any).mockImplementation(
        () => new Promise((resolve) => { resolveRestore = resolve; })
      );

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleRestore("note-1", "Deleted Note 1");
      });

      await waitFor(() => {
        expect(result.current.restoring).toBe("note-1");
      });

      await act(async () => {
        resolveRestore({ title: "Restored" });
      });

      await waitFor(() => {
        expect(result.current.restoring).toBeNull();
      });
    });
  });

  describe("영구 삭제", () => {
    it("이중 확인 후 삭제 실행", async () => {
      (permanentlyDeleteNote as any).mockResolvedValue({});

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handlePermanentDelete("note-1", "Deleted Note 1");
      });

      expect(global.confirm).toHaveBeenCalledTimes(2); // 이중 확인
      expect(permanentlyDeleteNote).toHaveBeenCalledWith("note-1");
      expect(global.alert).toHaveBeenCalledWith("영구적으로 삭제되었습니다.");
    });

    it("첫 번째 확인 취소", async () => {
      (global.confirm as any).mockReturnValueOnce(false);

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handlePermanentDelete("note-1", "Deleted Note 1");
      });

      expect(global.confirm).toHaveBeenCalledTimes(1);
      expect(permanentlyDeleteNote).not.toHaveBeenCalled();
    });

    it("두 번째 확인 취소", async () => {
      (global.confirm as any)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handlePermanentDelete("note-1", "Deleted Note 1");
      });

      expect(global.confirm).toHaveBeenCalledTimes(2);
      expect(permanentlyDeleteNote).not.toHaveBeenCalled();
    });

    it("삭제 실패 시 alert", async () => {
      (permanentlyDeleteNote as any).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handlePermanentDelete("note-1", "Deleted Note 1");
      });

      expect(global.alert).toHaveBeenCalledWith("삭제에 실패했습니다.");
    });

    it("삭제 중 상태 표시", async () => {
      let resolveDelete: any;
      (permanentlyDeleteNote as any).mockImplementation(
        () => new Promise((resolve) => { resolveDelete = resolve; })
      );

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handlePermanentDelete("note-1", "Deleted Note 1");
      });

      await waitFor(() => {
        expect(result.current.deleting).toBe("note-1");
      });

      await act(async () => {
        resolveDelete({});
      });

      await waitFor(() => {
        expect(result.current.deleting).toBeNull();
      });
    });
  });

  describe("중복 클릭 방지", () => {
    it("복구 중에 다른 작업 불가", async () => {
      let resolveRestore: any;
      (restoreNote as any).mockImplementation(
        () => new Promise((resolve) => { resolveRestore = resolve; })
      );

      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 첫 번째 복구 시작
      act(() => {
        result.current.handleRestore("note-1", "Note 1");
      });

      await waitFor(() => {
        expect(result.current.restoring).toBe("note-1");
      });

      // 두 번째 작업 시도 (무시되어야 함)
      await act(async () => {
        await result.current.handleRestore("note-2", "Note 2");
      });

      // restoreNote는 한 번만 호출되어야 함
      expect(restoreNote).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveRestore({ title: "Restored" });
      });
    });
  });

  describe("날짜 포맷팅", () => {
    it("formatDate - 날짜 포맷", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      const formatted = result.current.formatDate("2024-01-15T10:30:00Z");
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/1월/);
    });

    it("formatDate - undefined는 '알 수 없음'", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      expect(result.current.formatDate(undefined)).toBe("알 수 없음");
    });

    it("formatRelativeTime - 방금 전", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      const now = new Date().toISOString();
      expect(result.current.formatRelativeTime(now)).toBe("방금 전");
    });

    it("formatRelativeTime - N분 전", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      expect(result.current.formatRelativeTime(thirtyMinsAgo)).toBe("30분 전");
    });

    it("formatRelativeTime - N시간 전", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(result.current.formatRelativeTime(twoHoursAgo)).toBe("2시간 전");
    });

    it("formatRelativeTime - N일 전", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(result.current.formatRelativeTime(threeDaysAgo)).toBe("3일 전");
    });

    it("formatRelativeTime - undefined는 빈 문자열", () => {
      const { result } = renderHook(() => useTrash(), {
        wrapper: createWrapper(),
      });

      expect(result.current.formatRelativeTime(undefined)).toBe("");
    });
  });
});

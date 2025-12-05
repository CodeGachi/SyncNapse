/**
 * useTrash 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTrash } from "@/features/dashboard/views/use-trash";
import * as notesApi from "@/lib/api/services/notes.api";
import { ReactNode } from "react";

// Mock notes API
vi.mock("@/lib/api/services/notes.api", () => ({
  fetchTrashedNotes: vi.fn(),
  restoreNote: vi.fn(),
  permanentlyDeleteNote: vi.fn(),
}));

// Mock confirm/alert
const mockConfirm = vi.fn();
const mockAlert = vi.fn();
global.confirm = mockConfirm;
global.alert = mockAlert;

describe("useTrash", () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockTrashedNotes = [
    { id: "1", title: "Deleted Note 1", deletedAt: "2024-01-15T10:00:00Z" },
    { id: "2", title: "Deleted Note 2", deletedAt: "2024-01-14T10:00:00Z" },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.clearAllMocks();
  });

  describe("초기 로딩", () => {
    it("마운트 시 삭제된 노트 목록 로드", async () => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue(mockTrashedNotes as any);

      const { result } = renderHook(() => useTrash(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(notesApi.fetchTrashedNotes).toHaveBeenCalled();
      expect(result.current.trashedNotes).toEqual(mockTrashedNotes);
    });

    it("로드 실패시 alert 표시", async () => {
      vi.mocked(notesApi.fetchTrashedNotes).mockRejectedValue(new Error("Failed"));

      renderHook(() => useTrash(), { wrapper });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("휴지통 로드에 실패했습니다.");
      });
    });
  });

  describe("handleRestore", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue(mockTrashedNotes as any);
    });

    it("확인 없이 취소시 복구하지 않음", async () => {
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handleRestore("1", "Deleted Note 1");
      });

      expect(notesApi.restoreNote).not.toHaveBeenCalled();
    });

    it("확인시 노트 복구", async () => {
      mockConfirm.mockReturnValue(true);
      vi.mocked(notesApi.restoreNote).mockResolvedValue({ title: "Restored Note" } as any);
      vi.mocked(notesApi.fetchTrashedNotes)
        .mockResolvedValueOnce(mockTrashedNotes as any)
        .mockResolvedValueOnce([mockTrashedNotes[1]] as any);

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handleRestore("1", "Deleted Note 1");
      });

      expect(notesApi.restoreNote).toHaveBeenCalledWith("1");
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("복구되었습니다"));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["notes"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("복구 중 restoring 상태 관리", async () => {
      mockConfirm.mockReturnValue(true);

      let resolveRestore: (value: any) => void;
      vi.mocked(notesApi.restoreNote).mockImplementation(
        () => new Promise((resolve) => { resolveRestore = resolve; })
      );

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let restorePromise: Promise<void>;
      act(() => {
        restorePromise = result.current.handleRestore("1", "Deleted Note 1");
      });

      expect(result.current.restoring).toBe("1");

      await act(async () => {
        resolveRestore!({ title: "Restored Note" });
        await restorePromise;
      });

      expect(result.current.restoring).toBe(null);
    });

    it("복구 실패시 alert 표시", async () => {
      mockConfirm.mockReturnValue(true);
      vi.mocked(notesApi.restoreNote).mockRejectedValue(new Error("Restore failed"));

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handleRestore("1", "Deleted Note 1");
      });

      expect(mockAlert).toHaveBeenCalledWith("복구에 실패했습니다.");
    });

    it("이미 복구/삭제 중이면 실행하지 않음", async () => {
      mockConfirm.mockReturnValue(true);

      let resolveRestore: (value: any) => void;
      vi.mocked(notesApi.restoreNote).mockImplementation(
        () => new Promise((resolve) => { resolveRestore = resolve; })
      );

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 첫 번째 복구 시작
      act(() => {
        result.current.handleRestore("1", "Deleted Note 1");
      });

      // 두 번째 복구 시도 (무시되어야 함)
      await act(async () => {
        await result.current.handleRestore("2", "Deleted Note 2");
      });

      expect(notesApi.restoreNote).toHaveBeenCalledTimes(1);

      // 정리
      await act(async () => {
        resolveRestore!({ title: "Restored Note" });
      });
    });
  });

  describe("handlePermanentDelete", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue(mockTrashedNotes as any);
    });

    it("첫 번째 확인 취소시 삭제하지 않음", async () => {
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(notesApi.permanentlyDeleteNote).not.toHaveBeenCalled();
    });

    it("두 번째 확인 취소시 삭제하지 않음", async () => {
      mockConfirm
        .mockReturnValueOnce(true)  // 첫 번째 확인
        .mockReturnValueOnce(false); // 두 번째 확인

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });

      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(notesApi.permanentlyDeleteNote).not.toHaveBeenCalled();
    });

    it("이중 확인 후 영구 삭제", async () => {
      mockConfirm.mockReturnValue(true);
      vi.mocked(notesApi.permanentlyDeleteNote).mockResolvedValue(undefined);
      vi.mocked(notesApi.fetchTrashedNotes)
        .mockResolvedValueOnce(mockTrashedNotes as any)
        .mockResolvedValueOnce([mockTrashedNotes[1]] as any);

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });

      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(notesApi.permanentlyDeleteNote).toHaveBeenCalledWith("1");
      expect(mockAlert).toHaveBeenCalledWith("영구적으로 삭제되었습니다.");
    });

    it("삭제 실패시 alert 표시", async () => {
      mockConfirm.mockReturnValue(true);
      vi.mocked(notesApi.permanentlyDeleteNote).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });

      expect(mockAlert).toHaveBeenCalledWith("삭제에 실패했습니다.");
    });
  });

  describe("formatDate", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue([]);
    });

    it("날짜 문자열을 포맷팅", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const formatted = result.current.formatDate("2024-01-15T10:30:00Z");

      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/1/);
      expect(formatted).toMatch(/15/);
    });

    it("undefined 입력시 '알 수 없음' 반환", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const formatted = result.current.formatDate(undefined);

      expect(formatted).toBe("알 수 없음");
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue([]);
    });

    it("며칠 전 표시", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 2일 전 날짜 생성
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const formatted = result.current.formatRelativeTime(twoDaysAgo.toISOString());
      expect(formatted).toBe("2일 전");
    });

    it("몇 시간 전 표시", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 3시간 전 날짜 생성
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      const formatted = result.current.formatRelativeTime(threeHoursAgo.toISOString());
      expect(formatted).toBe("3시간 전");
    });

    it("몇 분 전 표시", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 30분 전 날짜 생성
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

      const formatted = result.current.formatRelativeTime(thirtyMinutesAgo.toISOString());
      expect(formatted).toBe("30분 전");
    });

    it("방금 전 표시", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 30초 전 날짜 생성
      const thirtySecondsAgo = new Date();
      thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);

      const formatted = result.current.formatRelativeTime(thirtySecondsAgo.toISOString());
      expect(formatted).toBe("방금 전");
    });

    it("undefined 입력시 빈 문자열 반환", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const formatted = result.current.formatRelativeTime(undefined);
      expect(formatted).toBe("");
    });
  });
});

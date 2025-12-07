/**
 * useTrash 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTrash } from "@/features/dashboard/views/use-trash";
import * as notesApi from "@/lib/api/services/notes.api";
import { ReactNode } from "react";

vi.mock("@/lib/api/services/notes.api", () => ({
  fetchTrashedNotes: vi.fn(),
  restoreNote: vi.fn(),
  permanentlyDeleteNote: vi.fn(),
}));

const mockConfirm = vi.fn();
const mockAlert = vi.fn();
global.confirm = mockConfirm;
global.alert = mockAlert;

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockTrashedNotes = [
  { id: "1", title: "Deleted Note 1", deletedAt: "2024-01-15T10:00:00Z" },
  { id: "2", title: "Deleted Note 2", deletedAt: "2024-01-14T10:00:00Z" },
];

beforeAll(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe("useTrash", () => {
  describe("초기 로딩", () => {
    it("로딩/데이터/에러 상태 처리", async () => {
      // 로딩 및 데이터 반환
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue(mockTrashedNotes as any);
      const { result } = renderHook(() => useTrash(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.trashedNotes).toEqual(mockTrashedNotes);

      // 에러 처리
      vi.mocked(notesApi.fetchTrashedNotes).mockRejectedValue(new Error("Failed"));
      renderHook(() => useTrash(), { wrapper });
      await waitFor(() => expect(mockAlert).toHaveBeenCalledWith("휴지통 로드에 실패했습니다."));
    });
  });

  describe("handleRestore", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue(mockTrashedNotes as any);
    });

    it("확인 다이얼로그에 따른 복구 처리", async () => {
      // 취소시 복구하지 않음
      mockConfirm.mockReturnValue(false);
      const { result } = renderHook(() => useTrash(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.handleRestore("1", "Deleted Note 1");
      });
      expect(notesApi.restoreNote).not.toHaveBeenCalled();

      // 확인시 복구
      mockConfirm.mockReturnValue(true);
      vi.mocked(notesApi.restoreNote).mockResolvedValue({ title: "Restored Note" } as any);

      await act(async () => {
        await result.current.handleRestore("1", "Deleted Note 1");
      });
      expect(notesApi.restoreNote).toHaveBeenCalledWith("1");
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("복구되었습니다"));
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
  });

  describe("handlePermanentDelete", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue(mockTrashedNotes as any);
    });

    it("이중 확인 다이얼로그 처리", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 첫 번째 취소
      mockConfirm.mockReturnValue(false);
      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });
      expect(notesApi.permanentlyDeleteNote).not.toHaveBeenCalled();

      // 두 번째 취소
      mockConfirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });
      expect(notesApi.permanentlyDeleteNote).not.toHaveBeenCalled();

      // 이중 확인 후 삭제
      mockConfirm.mockReturnValue(true);
      vi.mocked(notesApi.permanentlyDeleteNote).mockResolvedValue(undefined);
      await act(async () => {
        await result.current.handlePermanentDelete("1", "Deleted Note 1");
      });
      expect(notesApi.permanentlyDeleteNote).toHaveBeenCalledWith("1");
    });
  });

  describe("날짜 포맷팅", () => {
    beforeEach(() => {
      vi.mocked(notesApi.fetchTrashedNotes).mockResolvedValue([]);
    });

    it("formatDate/formatRelativeTime 동작", async () => {
      const { result } = renderHook(() => useTrash(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // formatDate
      expect(result.current.formatDate("2024-01-15T10:30:00Z")).toMatch(/2024.*1.*15/);
      expect(result.current.formatDate(undefined)).toBe("알 수 없음");

      // formatRelativeTime
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(result.current.formatRelativeTime(twoDaysAgo.toISOString())).toBe("2일 전");

      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
      expect(result.current.formatRelativeTime(threeHoursAgo.toISOString())).toBe("3시간 전");

      expect(result.current.formatRelativeTime(undefined)).toBe("");
    });
  });
});

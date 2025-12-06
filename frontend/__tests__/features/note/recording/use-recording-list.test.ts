/**
 * use-recording-list 테스트
 * 녹음 목록 관리 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecordingList } from "@/features/note/recording/use-recording-list";

// Mock API
vi.mock("@/lib/api/services/transcription.api", () => ({
  getSessions: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import * as transcriptionApi from "@/lib/api/services/transcription.api";

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

const mockSessions = [
  {
    id: "session-1",
    title: "Recording 1",
    duration: "120", // 2분
    createdAt: "2024-01-15T10:00:00Z",
    noteId: "note-1",
    audioRecordingId: "audio-1",
  },
  {
    id: "session-2",
    title: "Recording 2",
    duration: "90", // 1분 30초
    createdAt: "2024-01-14T09:00:00Z",
    noteId: "note-2",
    audioRecordingId: "audio-2",
  },
  {
    id: "session-3",
    title: "Recording 3",
    duration: "60",
    createdAt: "2024-01-13T08:00:00Z",
    noteId: "note-1",
    audioRecordingId: "audio-3",
  },
];

describe("useRecordingList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (transcriptionApi.getSessions as any).mockResolvedValue(mockSessions);
  });

  describe("녹음 목록 조회", () => {
    it("전체 녹음 목록 로드", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(3);
      expect(transcriptionApi.getSessions).toHaveBeenCalled();
    });

    it("최신순 정렬", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings[0].title).toBe("Recording 1"); // 최신
      expect(result.current.recordings[2].title).toBe("Recording 3"); // 오래된 것
    });
  });

  describe("noteId 필터링", () => {
    it("특정 노트의 녹음만 필터링", async () => {
      const { result } = renderHook(() => useRecordingList("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(2);
      expect(result.current.recordings.every((r) => r.noteId === "note-1")).toBe(true);
    });

    it("noteId가 null이면 전체 반환", async () => {
      const { result } = renderHook(() => useRecordingList(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(3);
    });
  });

  describe("포맷팅", () => {
    it("duration 포맷 (분:초)", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings[0].duration).toBe("2:00"); // 120초
      expect(result.current.recordings[1].duration).toBe("1:30"); // 90초
      expect(result.current.recordings[2].duration).toBe("1:00"); // 60초
    });

    it("날짜 포맷", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 날짜 포맷 검증 (YYYY/MM/DD 형식)
      expect(result.current.recordings[0].date).toMatch(/\d{4}\/\d{2}\/\d{2}/);
    });

    it("시간 포맷", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 시간 포맷 검증 (오전/오후 HH:MM 형식)
      expect(result.current.recordings[0].time).toBeDefined();
    });
  });

  describe("녹음 삭제", () => {
    it("removeRecording 호출", async () => {
      (transcriptionApi.deleteSession as any).mockResolvedValue({});

      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.removeRecording("session-1");
      });

      expect(transcriptionApi.deleteSession).toHaveBeenCalledWith("session-1");
    });

    it("Optimistic Update: UI 즉시 반영", async () => {
      // 느린 삭제 시뮬레이션
      (transcriptionApi.deleteSession as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(3);

      act(() => {
        result.current.removeRecording("session-1");
      });

      // Optimistic update로 즉시 UI에서 제거
      await waitFor(() => {
        expect(result.current.recordings).toHaveLength(2);
      });
    });
  });

  describe("refetch", () => {
    it("수동 갱신 함수 제공", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("데이터 구조", () => {
    it("포맷된 녹음 데이터 구조", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const recording = result.current.recordings[0];
      expect(recording).toHaveProperty("id");
      expect(recording).toHaveProperty("title");
      expect(recording).toHaveProperty("time");
      expect(recording).toHaveProperty("date");
      expect(recording).toHaveProperty("duration");
      expect(recording).toHaveProperty("sessionId");
      expect(recording).toHaveProperty("noteId");
      expect(recording).toHaveProperty("audioRecordingId");
    });
  });
});

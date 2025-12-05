/**
 * useRecordingList 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRecordingList } from "@/features/note/recording/use-recording-list";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as transcriptionApi from "@/lib/api/services/transcription.api";
import React from "react";

// Mock transcription API
vi.mock("@/lib/api/services/transcription.api", () => ({
  getSessions: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useRecordingList", () => {
  let queryClient: QueryClient;

  const mockSessions: transcriptionApi.TranscriptionSession[] = [
    {
      id: "session-1",
      title: "Recording 1",
      duration: "120",
      noteId: "note-1",
      createdAt: "2024-01-15T10:00:00Z",
      fullAudioUrl: "http://test.com/audio1.webm",
      audioRecordingId: "audio-1",
    },
    {
      id: "session-2",
      title: "Recording 2",
      duration: "90",
      noteId: "note-2",
      createdAt: "2024-01-15T11:00:00Z",
      fullAudioUrl: "http://test.com/audio2.webm",
      audioRecordingId: "audio-2",
    },
    {
      id: "session-3",
      title: "Recording 3",
      duration: "60",
      noteId: "note-1",
      createdAt: "2024-01-15T09:00:00Z",
      fullAudioUrl: "http://test.com/audio3.webm",
      audioRecordingId: "audio-3",
    },
  ];

  function createWrapper() {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.mocked(transcriptionApi.getSessions).mockResolvedValue(mockSessions);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("녹음 목록 조회", () => {
    it("마운트 시 녹음 목록 로드", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(transcriptionApi.getSessions).toHaveBeenCalled();
      expect(result.current.recordings).toHaveLength(3);
    });

    it("최신순으로 정렬", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // session-2가 가장 최신 (11:00)
      expect(result.current.recordings[0].sessionId).toBe("session-2");
      expect(result.current.recordings[1].sessionId).toBe("session-1");
      expect(result.current.recordings[2].sessionId).toBe("session-3");
    });

    it("포맷된 데이터 반환", async () => {
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

    it("duration 포맷팅 (분:초)", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 120초 = 2:00
      const recording1 = result.current.recordings.find(r => r.sessionId === "session-1");
      expect(recording1?.duration).toBe("2:00");

      // 90초 = 1:30
      const recording2 = result.current.recordings.find(r => r.sessionId === "session-2");
      expect(recording2?.duration).toBe("1:30");

      // 60초 = 1:00
      const recording3 = result.current.recordings.find(r => r.sessionId === "session-3");
      expect(recording3?.duration).toBe("1:00");
    });
  });

  describe("noteId 필터링", () => {
    it("noteId로 필터링된 녹음 반환", async () => {
      const { result } = renderHook(() => useRecordingList("note-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // note-1에 속한 녹음만 반환 (session-1, session-3)
      expect(result.current.recordings).toHaveLength(2);
      expect(result.current.recordings.every(r => r.noteId === "note-1")).toBe(true);
    });

    it("noteId가 없으면 전체 녹음 반환", async () => {
      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(3);
    });

    it("noteId가 null이면 전체 녹음 반환", async () => {
      const { result } = renderHook(() => useRecordingList(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(3);
    });
  });

  describe("녹음 삭제", () => {
    it("removeRecording 호출 시 API 호출", async () => {
      vi.mocked(transcriptionApi.deleteSession).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.removeRecording("session-1");

      await waitFor(() => {
        expect(transcriptionApi.deleteSession).toHaveBeenCalledWith("session-1");
      });
    });

    it("Optimistic update로 즉시 UI에서 제거", async () => {
      vi.mocked(transcriptionApi.deleteSession).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useRecordingList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recordings).toHaveLength(3);

      result.current.removeRecording("session-1");

      // 즉시 UI에서 제거 (Optimistic)
      await waitFor(() => {
        expect(result.current.recordings).toHaveLength(2);
      });

      expect(result.current.recordings.find(r => r.sessionId === "session-1")).toBeUndefined();
    });
  });

  describe("refetch", () => {
    it("refetch 함수 반환", async () => {
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
});

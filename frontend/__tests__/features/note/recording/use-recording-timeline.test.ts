/**
 * useRecordingTimeline 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecordingTimeline } from "@/features/note/recording/use-recording-timeline";
import * as audioApi from "@/lib/api/services/audio.api";

// Mock audio API
vi.mock("@/lib/api/services/audio.api", () => ({
  addTimelineEvent: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useRecordingTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(audioApi.addTimelineEvent).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("초기 이벤트 저장", () => {
    it("녹음 시작 시 초기 타임라인 이벤트 저장", async () => {
      const { rerender } = renderHook(
        (props) => useRecordingTimeline(props),
        {
          initialProps: {
            isRecording: false,
            recordingTime: 0,
            audioRecordingId: null,
            currentBackendId: "file-1",
            currentPage: 1,
          },
        }
      );

      // 녹음 시작
      rerender({
        isRecording: true,
        recordingTime: 0,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 1,
      });

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledWith("audio-123", {
          timestamp: 0,
          fileId: "file-1",
          pageNumber: 1,
        });
      });
    });

    it("audioRecordingId 없으면 이벤트 저장 안함", async () => {
      renderHook(() =>
        useRecordingTimeline({
          isRecording: true,
          recordingTime: 0,
          audioRecordingId: null,
          currentBackendId: "file-1",
          currentPage: 1,
        })
      );

      // 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(audioApi.addTimelineEvent).not.toHaveBeenCalled();
    });
  });

  describe("페이지 변경 감지", () => {
    it("같은 파일에서 페이지 변경 시 이벤트 저장", async () => {
      const { rerender } = renderHook(
        (props) => useRecordingTimeline(props),
        {
          initialProps: {
            isRecording: true,
            recordingTime: 0,
            audioRecordingId: "audio-123",
            currentBackendId: "file-1",
            currentPage: 1,
          },
        }
      );

      // 초기 이벤트 저장 대기
      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // 페이지 변경
      rerender({
        isRecording: true,
        recordingTime: 30,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 2,
      });

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledWith("audio-123", {
          timestamp: 30,
          fileId: "file-1",
          pageNumber: 2,
        });
      });
    });
  });

  describe("파일 변경 감지", () => {
    it("다른 파일로 변경 시 이벤트 저장", async () => {
      const { rerender } = renderHook(
        (props) => useRecordingTimeline(props),
        {
          initialProps: {
            isRecording: true,
            recordingTime: 0,
            audioRecordingId: "audio-123",
            currentBackendId: "file-1",
            currentPage: 1,
          },
        }
      );

      // 초기 이벤트 저장 대기
      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // 파일 변경
      rerender({
        isRecording: true,
        recordingTime: 45,
        audioRecordingId: "audio-123",
        currentBackendId: "file-2",
        currentPage: 1,
      });

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledWith("audio-123", {
          timestamp: 45,
          fileId: "file-2",
          pageNumber: 1,
        });
      });
    });
  });

  describe("녹음 중지 시 상태 초기화", () => {
    it("녹음 중지 시 상태 초기화", async () => {
      const { rerender } = renderHook(
        (props) => useRecordingTimeline(props),
        {
          initialProps: {
            isRecording: true,
            recordingTime: 0,
            audioRecordingId: "audio-123",
            currentBackendId: "file-1",
            currentPage: 1,
          },
        }
      );

      // 초기 이벤트 저장 대기
      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // 녹음 중지
      rerender({
        isRecording: false,
        recordingTime: 60,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 2,
      });

      // 다시 녹음 시작 - 초기 이벤트가 다시 저장되어야 함
      rerender({
        isRecording: true,
        recordingTime: 0,
        audioRecordingId: "audio-456",
        currentBackendId: "file-1",
        currentPage: 1,
      });

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledWith("audio-456", {
          timestamp: 0,
          fileId: "file-1",
          pageNumber: 1,
        });
      });
    });
  });

  describe("중복 저장 방지", () => {
    it("같은 timestamp에 중복 저장 안함", async () => {
      const { rerender } = renderHook(
        (props) => useRecordingTimeline(props),
        {
          initialProps: {
            isRecording: true,
            recordingTime: 0,
            audioRecordingId: "audio-123",
            currentBackendId: "file-1",
            currentPage: 1,
          },
        }
      );

      // 초기 이벤트 저장 대기
      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // 같은 시간에 페이지 변경 (밀리초 차이는 무시)
      rerender({
        isRecording: true,
        recordingTime: 10.5,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 2,
      });

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalledTimes(1);
      });

      // 같은 초에 다시 변경해도 저장 안함
      rerender({
        isRecording: true,
        recordingTime: 10.9,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 3,
      });

      // 여전히 한 번만 호출됨 (10초에 대해)
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(audioApi.addTimelineEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("에러 처리", () => {
    it("409 충돌 에러는 무시", async () => {
      const error = { status: 409 };
      vi.mocked(audioApi.addTimelineEvent).mockRejectedValue(error);

      renderHook(() =>
        useRecordingTimeline({
          isRecording: true,
          recordingTime: 0,
          audioRecordingId: "audio-123",
          currentBackendId: "file-1",
          currentPage: 1,
        })
      );

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalled();
      });

      // 에러가 발생해도 훅이 정상 동작
    });

    it("다른 에러는 timestamp를 Set에서 제거", async () => {
      const error = { status: 500 };
      vi.mocked(audioApi.addTimelineEvent).mockRejectedValue(error);

      const { rerender } = renderHook(
        (props) => useRecordingTimeline(props),
        {
          initialProps: {
            isRecording: true,
            recordingTime: 0,
            audioRecordingId: "audio-123",
            currentBackendId: "file-1",
            currentPage: 1,
          },
        }
      );

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalled();
      });

      vi.clearAllMocks();
      vi.mocked(audioApi.addTimelineEvent).mockResolvedValue({} as any);

      // 재시도 가능해야 함 (timestamp가 Set에서 제거됨)
      // 녹음 중지 후 다시 시작
      rerender({
        isRecording: false,
        recordingTime: 0,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 1,
      });

      rerender({
        isRecording: true,
        recordingTime: 0,
        audioRecordingId: "audio-123",
        currentBackendId: "file-1",
        currentPage: 1,
      });

      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalled();
      });
    });
  });

  describe("saveTimelineEvent 반환", () => {
    it("수동 저장용 함수 반환", () => {
      const { result } = renderHook(() =>
        useRecordingTimeline({
          isRecording: true,
          recordingTime: 0,
          audioRecordingId: "audio-123",
          currentBackendId: "file-1",
          currentPage: 1,
        })
      );

      expect(result.current.saveTimelineEvent).toBeDefined();
      expect(typeof result.current.saveTimelineEvent).toBe("function");
    });

    it("수동으로 타임라인 이벤트 저장 가능", async () => {
      vi.clearAllMocks();

      const { result } = renderHook(() =>
        useRecordingTimeline({
          isRecording: true,
          recordingTime: 50,
          audioRecordingId: "audio-123",
          currentBackendId: "file-1",
          currentPage: 1,
        })
      );

      // 초기 이벤트 저장 대기
      await waitFor(() => {
        expect(audioApi.addTimelineEvent).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // 수동 저장
      await act(async () => {
        await result.current.saveTimelineEvent(100, "file-2", 5);
      });

      expect(audioApi.addTimelineEvent).toHaveBeenCalledWith("audio-123", {
        timestamp: 100,
        fileId: "file-2",
        pageNumber: 5,
      });
    });
  });
});

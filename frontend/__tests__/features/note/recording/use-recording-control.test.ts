/**
 * use-recording-control 훅 테스트
 * 녹음 제어 및 상태 관리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecordingControl } from "@/features/note/recording/use-recording-control";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock useRecording
const mockStartRecording = vi.fn();
const mockPauseRecording = vi.fn();
const mockResumeRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockCancelRecording = vi.fn();

let mockRecordingState = {
  isRecording: false,
  isPaused: false,
  recordingTime: 0,
  recordingStartTime: null as Date | null,
  formattedTime: "00:00",
  error: null as string | null,
  audioRecordingId: null as string | null,
};

vi.mock("./use-recording", () => ({
  useRecording: () => ({
    ...mockRecordingState,
    startRecording: mockStartRecording,
    pauseRecording: mockPauseRecording,
    resumeRecording: mockResumeRecording,
    stopRecording: mockStopRecording,
    cancelRecording: mockCancelRecording,
  }),
}));

// Mock stores
const mockSetIsRecording = vi.fn();
const mockSetIsPaused = vi.fn();
const mockSetStopRecordingCallback = vi.fn();

vi.mock("@/stores", () => ({
  useRecordingStore: () => ({
    setIsRecording: mockSetIsRecording,
    setIsPaused: mockSetIsPaused,
    setStopRecordingCallback: mockSetStopRecordingCallback,
  }),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("useRecordingControl", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockRecordingState = {
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      recordingStartTime: null,
      formattedTime: "00:00",
      error: null,
      audioRecordingId: null,
    };
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.recordingTime).toBe("00:00");
      expect(result.current.recordingError).toBeNull();
      expect(result.current.isNameModalOpen).toBe(false);
      expect(result.current.isSavingRecording).toBe(false);
    });

    it("전역 스토어와 동기화", () => {
      renderHook(() => useRecordingControl("note-1"), { wrapper });

      expect(mockSetIsRecording).toHaveBeenCalledWith(false);
      expect(mockSetIsPaused).toHaveBeenCalledWith(false);
    });
  });

  describe("handlePlayPause", () => {
    it("녹음 중이 아니고 audioRef 없으면 녹음 시작", () => {
      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(false, null);
      });

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it("녹음 중이고 일시정지 상태면 재개", () => {
      mockRecordingState.isRecording = true;
      mockRecordingState.isPaused = true;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(false, null);
      });

      expect(mockResumeRecording).toHaveBeenCalled();
    });

    it("녹음 중이고 일시정지 아니면 일시정지", () => {
      mockRecordingState.isRecording = true;
      mockRecordingState.isPaused = false;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(false, null);
      });

      expect(mockPauseRecording).toHaveBeenCalled();
    });

    it("녹음본 재생 중이면 일시정지", () => {
      const mockAudioRef = {
        src: "blob:test",
        pause: vi.fn(),
        play: vi.fn(),
      } as unknown as HTMLAudioElement;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(true, mockAudioRef);
      });

      expect(mockAudioRef.pause).toHaveBeenCalled();
    });

    it("녹음본 있고 재생 중 아니면 재생", () => {
      const mockAudioRef = {
        src: "blob:test",
        pause: vi.fn(),
        play: vi.fn(),
      } as unknown as HTMLAudioElement;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(false, mockAudioRef);
      });

      expect(mockAudioRef.play).toHaveBeenCalled();
    });
  });

  describe("handleStopRecording", () => {
    it("녹음 중이면 이름 모달 열기", () => {
      mockRecordingState.isRecording = true;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      expect(result.current.isNameModalOpen).toBe(true);
    });

    it("녹음 중이 아니면 모달 열지 않음", () => {
      mockRecordingState.isRecording = false;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      expect(result.current.isNameModalOpen).toBe(false);
    });
  });

  describe("handleSaveRecording", () => {
    it("제목과 함께 녹음 저장", async () => {
      mockRecordingState.isRecording = true;
      mockStopRecording.mockResolvedValue({
        sessionId: "session-1",
        audioRecordingId: "audio-1",
        duration: 120,
        createdAt: new Date(),
      });

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      // 모달 열기
      act(() => {
        result.current.handleStopRecording();
      });

      // 저장
      await act(async () => {
        await result.current.handleSaveRecording("My Recording");
      });

      expect(mockStopRecording).toHaveBeenCalledWith("My Recording");
      expect(result.current.isNameModalOpen).toBe(false);
    });

    it("빈 제목이면 타임스탬프 기반 제목 생성", async () => {
      const startTime = new Date(2024, 0, 15, 10, 30, 45);
      mockRecordingState.isRecording = true;
      mockRecordingState.recordingStartTime = startTime;
      mockStopRecording.mockResolvedValue({
        sessionId: "session-1",
        audioRecordingId: "audio-1",
        duration: 120,
        createdAt: new Date(),
      });

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      await act(async () => {
        await result.current.handleSaveRecording("");
      });

      expect(mockStopRecording).toHaveBeenCalledWith("2024_01_15_10:30:45");
    });

    it("저장 실패시 에러 알림", async () => {
      mockRecordingState.isRecording = true;
      mockStopRecording.mockRejectedValue(new Error("Save failed"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      await act(async () => {
        await result.current.handleSaveRecording("Test");
      });

      expect(alertSpy).toHaveBeenCalledWith("녹음 저장에 실패했습니다");
      alertSpy.mockRestore();
    });
  });

  describe("handleCancelSave", () => {
    it("녹음 취소 및 모달 닫기", () => {
      mockRecordingState.isRecording = true;

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      // 모달 열기
      act(() => {
        result.current.handleStopRecording();
      });

      expect(result.current.isNameModalOpen).toBe(true);

      // 취소
      act(() => {
        result.current.handleCancelSave();
      });

      expect(mockCancelRecording).toHaveBeenCalled();
      expect(result.current.isNameModalOpen).toBe(false);
    });
  });

  describe("전역 스토어 콜백", () => {
    it("stopRecordingCallback 등록", () => {
      renderHook(() => useRecordingControl("note-1"), { wrapper });

      expect(mockSetStopRecordingCallback).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("언마운트시 콜백 해제", () => {
      const { unmount } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      unmount();

      expect(mockSetStopRecordingCallback).toHaveBeenCalledWith(null);
    });
  });
});

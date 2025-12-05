/**
 * useRecordingControl 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecordingControl } from "@/features/note/recording/use-recording-control";
import * as useRecordingModule from "@/features/note/recording/use-recording";
import * as recordingStore from "@/stores";
import { ReactNode } from "react";

// Mock useRecording
vi.mock("@/features/note/recording/use-recording", () => ({
  useRecording: vi.fn(),
}));

// Mock recording store
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

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe("useRecordingControl", () => {
  let queryClient: QueryClient;
  let mockStartRecording: ReturnType<typeof vi.fn>;
  let mockPauseRecording: ReturnType<typeof vi.fn>;
  let mockResumeRecording: ReturnType<typeof vi.fn>;
  let mockStopRecording: ReturnType<typeof vi.fn>;
  let mockCancelRecording: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockStartRecording = vi.fn().mockResolvedValue(undefined);
    mockPauseRecording = vi.fn();
    mockResumeRecording = vi.fn();
    mockStopRecording = vi.fn().mockResolvedValue({
      id: "rec-1",
      sessionId: "session-1",
      duration: 120,
      createdAt: new Date(),
    });
    mockCancelRecording = vi.fn();

    vi.mocked(useRecordingModule.useRecording).mockReturnValue({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      recordingStartTime: null,
      formattedTime: "00:00",
      error: null,
      audioRecordingId: null,
      startRecording: mockStartRecording,
      pauseRecording: mockPauseRecording,
      resumeRecording: mockResumeRecording,
      stopRecording: mockStopRecording,
      cancelRecording: mockCancelRecording,
    } as any);

    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("녹음 중이 아닐 때 초기 상태", () => {
      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.recordingTime).toBe("00:00");
      expect(result.current.isNameModalOpen).toBe(false);
      expect(result.current.isSavingRecording).toBe(false);
    });

    it("전역 store와 동기화", async () => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: true,
        isPaused: false,
        recordingTime: 60,
        formattedTime: "01:00",
        error: null,
        audioRecordingId: null,
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);

      renderHook(() => useRecordingControl("note-1"), { wrapper });

      await waitFor(() => {
        expect(mockSetIsRecording).toHaveBeenCalledWith(true);
        expect(mockSetIsPaused).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("handlePlayPause", () => {
    it("녹음 중이고 일시정지 상태면 resumeRecording 호출", () => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: true,
        isPaused: true,
        recordingTime: 30,
        formattedTime: "00:30",
        error: null,
        audioRecordingId: null,
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(false, null);
      });

      expect(mockResumeRecording).toHaveBeenCalled();
    });

    it("녹음 중이고 재생 중이면 pauseRecording 호출", () => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: true,
        isPaused: false,
        recordingTime: 30,
        formattedTime: "00:30",
        error: null,
        audioRecordingId: null,
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handlePlayPause(false, null);
      });

      expect(mockPauseRecording).toHaveBeenCalled();
    });

    it("녹음 중이 아니고 오디오가 재생 중이면 pause 호출", () => {
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

    it("녹음 중이 아니고 오디오가 있는데 재생 중이 아니면 play 호출", () => {
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

    it("녹음 중이 아니고 오디오도 없으면 녹음 시작", async () => {
      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      await act(async () => {
        result.current.handlePlayPause(false, null);
      });

      expect(mockStartRecording).toHaveBeenCalled();
    });
  });

  describe("handleStopRecording", () => {
    it("녹음 중이면 이름 입력 모달 열기", () => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: true,
        isPaused: false,
        recordingTime: 60,
        formattedTime: "01:00",
        error: null,
        audioRecordingId: null,
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      expect(result.current.isNameModalOpen).toBe(true);
    });

    it("녹음 중이 아니면 모달 열리지 않음", () => {
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
    beforeEach(() => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: true,
        isPaused: false,
        recordingTime: 60,
        recordingStartTime: new Date("2024-01-15T10:30:00"),
        formattedTime: "01:00",
        error: null,
        audioRecordingId: "audio-1",
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);
    });

    it("제목과 함께 저장", async () => {
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
      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      await act(async () => {
        await result.current.handleSaveRecording("   ");
      });

      // 타임스탬프 형식: YYYY_MM_DD_HH:MM:SS
      expect(mockStopRecording).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}_\d{2}_\d{2}_\d{2}:\d{2}:\d{2}$/)
      );
    });

    it("저장 중 isSavingRecording이 true", async () => {
      let resolveStop: (value: any) => void;
      mockStopRecording.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStop = resolve;
          })
      );

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.handleSaveRecording("Test");
      });

      expect(result.current.isSavingRecording).toBe(true);

      await act(async () => {
        resolveStop!({
          id: "rec-1",
          sessionId: "session-1",
          duration: 60,
          createdAt: new Date(),
        });
        await savePromise;
      });

      expect(result.current.isSavingRecording).toBe(false);
    });

    it("저장 실패시 alert 표시", async () => {
      mockStopRecording.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      act(() => {
        result.current.handleStopRecording();
      });

      await act(async () => {
        await result.current.handleSaveRecording("Test");
      });

      expect(mockAlert).toHaveBeenCalledWith("녹음 저장에 실패했습니다");
    });

    it("녹음 중이 아니면 저장하지 않음", async () => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        formattedTime: "00:00",
        error: null,
        audioRecordingId: null,
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);

      const { result } = renderHook(() => useRecordingControl("note-1"), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleSaveRecording("Test");
      });

      expect(mockStopRecording).not.toHaveBeenCalled();
    });
  });

  describe("handleCancelSave", () => {
    it("녹음 취소하고 모달 닫기", () => {
      vi.mocked(useRecordingModule.useRecording).mockReturnValue({
        isRecording: true,
        isPaused: false,
        recordingTime: 60,
        formattedTime: "01:00",
        error: null,
        audioRecordingId: null,
        startRecording: mockStartRecording,
        pauseRecording: mockPauseRecording,
        resumeRecording: mockResumeRecording,
        stopRecording: mockStopRecording,
        cancelRecording: mockCancelRecording,
      } as any);

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

  describe("stopRecording 콜백 등록", () => {
    it("마운트시 전역 store에 콜백 등록", () => {
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

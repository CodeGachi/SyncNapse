/**
 * useRecordingControl 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecordingControl } from "@/features/note/recording/use-recording-control";
import * as useRecordingModule from "@/features/note/recording/use-recording";
import { ReactNode } from "react";

vi.mock("@/features/note/recording/use-recording", () => ({
  useRecording: vi.fn(),
}));

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

const mockAlert = vi.fn();
global.alert = mockAlert;

let queryClient: QueryClient;
let mockStartRecording: ReturnType<typeof vi.fn>;
let mockPauseRecording: ReturnType<typeof vi.fn>;
let mockResumeRecording: ReturnType<typeof vi.fn>;
let mockStopRecording: ReturnType<typeof vi.fn>;
let mockCancelRecording: ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const setupDefaultMocks = (overrides: any = {}) => {
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
    ...overrides,
  } as any);
};

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockStartRecording = vi.fn().mockResolvedValue(undefined);
  mockPauseRecording = vi.fn();
  mockResumeRecording = vi.fn();
  mockStopRecording = vi.fn().mockResolvedValue({
    id: "rec-1", sessionId: "session-1", duration: 120, createdAt: new Date(),
  });
  mockCancelRecording = vi.fn();
});

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  setupDefaultMocks();
});

describe("useRecordingControl", () => {
  it("초기 상태 및 전역 store 동기화", async () => {
    const { result } = renderHook(() => useRecordingControl("note-1"), { wrapper });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.recordingTime).toBe("00:00");
    expect(result.current.isNameModalOpen).toBe(false);

    // 전역 store 동기화
    setupDefaultMocks({ isRecording: true, isPaused: false, formattedTime: "01:00" });
    renderHook(() => useRecordingControl("note-1"), { wrapper });
    await waitFor(() => {
      expect(mockSetIsRecording).toHaveBeenCalledWith(true);
      expect(mockSetIsPaused).toHaveBeenCalledWith(false);
    });
  });

  it("handlePlayPause 동작", async () => {
    // 녹음 중 일시정지 상태에서 재개
    setupDefaultMocks({ isRecording: true, isPaused: true });
    const { result: pausedResult } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    act(() => pausedResult.current.handlePlayPause(false, null));
    expect(mockResumeRecording).toHaveBeenCalled();

    // 녹음 중 재생 상태에서 일시정지
    setupDefaultMocks({ isRecording: true, isPaused: false });
    const { result: recordingResult } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    act(() => recordingResult.current.handlePlayPause(false, null));
    expect(mockPauseRecording).toHaveBeenCalled();

    // 녹음 중 아니고 오디오 재생 중이면 pause
    setupDefaultMocks();
    const mockAudioRef = { src: "blob:test", pause: vi.fn(), play: vi.fn() } as unknown as HTMLAudioElement;
    const { result: audioResult } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    act(() => audioResult.current.handlePlayPause(true, mockAudioRef));
    expect(mockAudioRef.pause).toHaveBeenCalled();

    // 녹음 중 아니고 오디오 있지만 재생 중 아니면 play
    act(() => audioResult.current.handlePlayPause(false, mockAudioRef));
    expect(mockAudioRef.play).toHaveBeenCalled();

    // 녹음 중 아니고 오디오 없으면 녹음 시작
    const { result: noAudioResult } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    await act(async () => noAudioResult.current.handlePlayPause(false, null));
    expect(mockStartRecording).toHaveBeenCalled();
  });

  it("handleStopRecording 및 handleSaveRecording", async () => {
    setupDefaultMocks({
      isRecording: true,
      recordingTime: 60,
      recordingStartTime: new Date("2024-01-15T10:30:00"),
      audioRecordingId: "audio-1",
    });

    const { result } = renderHook(() => useRecordingControl("note-1"), { wrapper });

    // 녹음 중이면 모달 열기
    act(() => result.current.handleStopRecording());
    expect(result.current.isNameModalOpen).toBe(true);

    // 제목과 함께 저장
    await act(async () => {
      await result.current.handleSaveRecording("My Recording");
    });
    expect(mockStopRecording).toHaveBeenCalledWith("My Recording");
    expect(result.current.isNameModalOpen).toBe(false);

    // 빈 제목이면 타임스탬프 기반 제목
    act(() => result.current.handleStopRecording());
    await act(async () => {
      await result.current.handleSaveRecording("   ");
    });
    expect(mockStopRecording).toHaveBeenLastCalledWith(expect.stringMatching(/^\d{4}_\d{2}_\d{2}_\d{2}:\d{2}:\d{2}$/));

    // 저장 실패시 alert
    mockStopRecording.mockRejectedValueOnce(new Error("Save failed"));
    act(() => result.current.handleStopRecording());
    await act(async () => {
      await result.current.handleSaveRecording("Test");
    });
    expect(mockAlert).toHaveBeenCalledWith("녹음 저장에 실패했습니다");

    // 녹음 중 아니면 저장하지 않음
    setupDefaultMocks({ isRecording: false });
    const { result: notRecordingResult } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    mockStopRecording.mockClear();
    await act(async () => {
      await notRecordingResult.current.handleSaveRecording("Test");
    });
    expect(mockStopRecording).not.toHaveBeenCalled();
  });

  it("handleCancelSave 및 콜백 등록/해제", () => {
    setupDefaultMocks({ isRecording: true });
    const { result, unmount } = renderHook(() => useRecordingControl("note-1"), { wrapper });

    // 모달 열고 취소
    act(() => result.current.handleStopRecording());
    expect(result.current.isNameModalOpen).toBe(true);
    act(() => result.current.handleCancelSave());
    expect(mockCancelRecording).toHaveBeenCalled();
    expect(result.current.isNameModalOpen).toBe(false);

    // 마운트시 콜백 등록, 언마운트시 해제
    expect(mockSetStopRecordingCallback).toHaveBeenCalledWith(expect.any(Function));
    unmount();
    expect(mockSetStopRecordingCallback).toHaveBeenLastCalledWith(null);
  });
});

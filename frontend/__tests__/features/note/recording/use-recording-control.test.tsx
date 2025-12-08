/**
 * useRecordingControl 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRecordingControl } from "@/features/note/recording/use-recording-control";
import * as useRecordingModule from "@/features/note/recording/use-recording";
import { ReactNode } from "react";

vi.mock("@/features/note/recording/use-recording", () => ({ useRecording: vi.fn() }));

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

global.alert = vi.fn();

let queryClient: QueryClient;
let mockFns: Record<string, ReturnType<typeof vi.fn>>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const setupMocks = (overrides: any = {}) => {
  vi.mocked(useRecordingModule.useRecording).mockReturnValue({
    isRecording: false, isPaused: false, recordingTime: 0, recordingStartTime: null,
    formattedTime: "00:00", error: null, audioRecordingId: null, ...mockFns, ...overrides,
  } as any);
};

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockFns = {
    startRecording: vi.fn().mockResolvedValue(undefined),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    stopRecording: vi.fn().mockResolvedValue({ id: "rec-1", sessionId: "session-1", duration: 120, createdAt: new Date() }),
    cancelRecording: vi.fn(),
  };
});

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  setupMocks();
});

describe("useRecordingControl", () => {
  it("초기 상태 및 전역 store 동기화", async () => {
    const { result } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingTime).toBe("00:00");

    setupMocks({ isRecording: true });
    renderHook(() => useRecordingControl("note-1"), { wrapper });
    await waitFor(() => expect(mockSetIsRecording).toHaveBeenCalledWith(true));
  });

  it("handlePlayPause - 녹음/일시정지/오디오 재생", async () => {
    setupMocks({ isRecording: true, isPaused: true });
    const { result: r1 } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    act(() => r1.current.handlePlayPause(false, null));
    expect(mockFns.resumeRecording).toHaveBeenCalled();

    setupMocks({ isRecording: true, isPaused: false });
    const { result: r2 } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    act(() => r2.current.handlePlayPause(false, null));
    expect(mockFns.pauseRecording).toHaveBeenCalled();

    setupMocks();
    const mockAudio = { src: "blob:test", pause: vi.fn(), play: vi.fn() } as unknown as HTMLAudioElement;
    const { result: r3 } = renderHook(() => useRecordingControl("note-1"), { wrapper });
    act(() => r3.current.handlePlayPause(true, mockAudio));
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("handleStopRecording 및 handleSaveRecording", async () => {
    setupMocks({ isRecording: true, recordingTime: 60, recordingStartTime: new Date(), audioRecordingId: "audio-1" });
    const { result } = renderHook(() => useRecordingControl("note-1"), { wrapper });

    act(() => result.current.handleStopRecording());
    expect(result.current.isNameModalOpen).toBe(true);

    await act(async () => await result.current.handleSaveRecording("My Recording"));
    expect(mockFns.stopRecording).toHaveBeenCalledWith("My Recording");

    // 저장 실패시 alert
    mockFns.stopRecording.mockRejectedValueOnce(new Error("Save failed"));
    act(() => result.current.handleStopRecording());
    await act(async () => await result.current.handleSaveRecording("Test"));
    expect(global.alert).toHaveBeenCalledWith("녹음 저장에 실패했습니다");
  });

  it("handleCancelSave 및 콜백 등록/해제", () => {
    setupMocks({ isRecording: true });
    const { result, unmount } = renderHook(() => useRecordingControl("note-1"), { wrapper });

    act(() => result.current.handleStopRecording());
    act(() => result.current.handleCancelSave());
    expect(mockFns.cancelRecording).toHaveBeenCalled();
    expect(mockSetStopRecordingCallback).toHaveBeenCalledWith(expect.any(Function));
    unmount();
    expect(mockSetStopRecordingCallback).toHaveBeenLastCalledWith(null);
  });
});

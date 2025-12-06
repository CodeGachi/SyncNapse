/**
 * use-recording 훅 테스트
 * MediaRecorder API + Web Speech API 기반 녹음 기능
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecording } from "@/features/note/recording/use-recording";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock MediaRecorder
class MockMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  onerror: ((event: { error: Error }) => void) | null = null;
  mimeType = "audio/webm";

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions
  ) {}

  start() {
    this.state = "recording";
    this.onstart?.();
  }

  stop() {
    this.state = "inactive";
    // Simulate data available
    this.ondataavailable?.({ data: new Blob(["audio-data"], { type: "audio/webm" }) });
    this.onstop?.();
  }

  pause() {
    this.state = "paused";
    this.onpause?.();
  }

  resume() {
    this.state = "recording";
    this.onresume?.();
  }

  requestData() {
    this.ondataavailable?.({ data: new Blob(["chunk"], { type: "audio/webm" }) });
  }

  static isTypeSupported(type: string) {
    return type === "audio/webm";
  }
}

// Mock MediaStream
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor() {
    this.tracks = [
      {
        stop: vi.fn(),
        label: "microphone",
        getSettings: () => ({ sampleRate: 48000, channelCount: 1 }),
      } as unknown as MediaStreamTrack,
    ];
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks;
  }
}

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();

// Mock stores
const mockSetScriptSegments = vi.fn();
const mockClearScriptSegments = vi.fn();

vi.mock("@/stores", () => ({
  useScriptTranslationStore: () => ({
    setScriptSegments: mockSetScriptSegments,
    clearScriptSegments: mockClearScriptSegments,
  }),
}));

// Mock SpeechRecognitionService
vi.mock("@/lib/speech/speech-recognition", () => ({
  SpeechRecognitionService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  })),
}));

// Mock APIs
const mockCreateSession = vi.fn();
const mockSaveFullAudio = vi.fn();
const mockSaveTranscript = vi.fn();
const mockEndSession = vi.fn();
const mockCreateRecording = vi.fn();

vi.mock("@/lib/api/services/transcription.api", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  saveFullAudio: (...args: unknown[]) => mockSaveFullAudio(...args),
  saveTranscript: (...args: unknown[]) => mockSaveTranscript(...args),
  endSession: (id: string) => mockEndSession(id),
}));

vi.mock("@/lib/api/services/audio.api", () => ({
  createRecording: (...args: unknown[]) => mockCreateRecording(...args),
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

describe("useRecording", () => {
  let queryClient: QueryClient;
  let originalMediaRecorder: typeof MediaRecorder;
  let originalMediaDevices: typeof navigator.mediaDevices;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Setup MediaRecorder mock
    originalMediaRecorder = global.MediaRecorder;
    global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    // Setup navigator.mediaDevices mock
    originalMediaDevices = navigator.mediaDevices;
    mockGetUserMedia.mockResolvedValue(new MockMediaStream());
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });

    // Setup API mocks
    mockCreateRecording.mockResolvedValue({ id: "audio-recording-1" });
    mockCreateSession.mockResolvedValue({ id: "session-1" });
    mockSaveFullAudio.mockResolvedValue({
      fullAudioUrl: "https://example.com/audio.webm",
      fullAudioKey: "audio-key",
      status: "completed",
    });
    mockEndSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.MediaRecorder = originalMediaRecorder;
    Object.defineProperty(navigator, "mediaDevices", {
      value: originalMediaDevices,
      writable: true,
    });
    queryClient.clear();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.recordingTime).toBe(0);
      expect(result.current.formattedTime).toBe("00:00");
      expect(result.current.error).toBeNull();
      expect(result.current.isSaving).toBe(false);
      expect(result.current.audioRecordingId).toBeNull();
    });
  });

  describe("startRecording", () => {
    it("마이크 권한 요청", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: true,
          noiseSuppression: true,
        }),
      });
    });

    it("녹음 시작시 상태 변경", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.isPaused).toBe(false);
    });

    it("noteId가 있으면 AudioRecording 생성", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockCreateRecording).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: "note-1",
        })
      );
    });

    it("이전 스크립트 세그먼트 정리", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockClearScriptSegments).toHaveBeenCalled();
    });

    it("마이크 권한 거부시 에러", async () => {
      mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe("마이크 권한이 필요합니다");
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe("pauseRecording", () => {
    it("녹음 일시정지", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
    });
  });

  describe("resumeRecording", () => {
    it("일시정지된 녹음 재개", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe("stopRecording", () => {
    it("녹음 종료 및 데이터 반환", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      let recordingData: any;
      await act(async () => {
        recordingData = await result.current.stopRecording("Test Recording");
      });

      expect(recordingData).toEqual(
        expect.objectContaining({
          title: "Test Recording",
          audioBlob: expect.any(Blob),
          duration: expect.any(Number),
          createdAt: expect.any(Date),
        })
      );
    });

    it("녹음 종료시 상태 초기화", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording("Test");
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.recordingTime).toBe(0);
    });

    it("세션 생성 및 오디오 업로드", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording("Test");
      });

      expect(mockCreateSession).toHaveBeenCalled();
      expect(mockSaveFullAudio).toHaveBeenCalled();
      expect(mockEndSession).toHaveBeenCalled();
    });
  });

  describe("cancelRecording", () => {
    it("녹음 취소 및 리소스 정리", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.cancelRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.recordingTime).toBe(0);
      expect(mockClearScriptSegments).toHaveBeenCalled();
    });
  });

  describe("타이머", () => {
    it("녹음 중 시간 증가", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.recordingTime).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.recordingTime).toBe(3);
      expect(result.current.formattedTime).toBe("00:03");
    });

    it("일시정지시 타이머 중지", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.recordingTime).toBe(2);

      act(() => {
        result.current.pauseRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // 일시정지 중이므로 시간 증가 없음
      expect(result.current.recordingTime).toBe(2);
    });
  });

  describe("formattedTime", () => {
    it("시간 포맷팅 (분:초)", async () => {
      const { result } = renderHook(() => useRecording("note-1"), { wrapper });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(65000); // 65초
      });

      expect(result.current.formattedTime).toBe("01:05");
    });
  });
});

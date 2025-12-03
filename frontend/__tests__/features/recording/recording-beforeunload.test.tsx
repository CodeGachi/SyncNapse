/**
 * Recording BeforeUnload Test
 * 녹음 중 새로고침 시 경고 테스트
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecording } from '@/features/note/recording/use-recording';
import * as transcriptionApi from '@/lib/api/services/transcription.api';

// Mock transcription API
vi.mock('@/lib/api/services/transcription.api');

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  state: 'inactive',
  ondataavailable: null as ((event: BlobEvent) => void) | null,
  onstop: null as ((event: Event) => void) | null,
  addEventListener: vi.fn((event, handler) => {
    if (event === 'dataavailable') {
      mockMediaRecorder.ondataavailable = handler;
    } else if (event === 'stop') {
      mockMediaRecorder.onstop = handler;
    }
  }),
  removeEventListener: vi.fn(),
};

const mockAudioTrack = {
  stop: vi.fn(),
  kind: 'audio',
  getSettings: vi.fn(() => ({ sampleRate: 48000 })),
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() =>
      Promise.resolve({
        getTracks: () => [mockAudioTrack],
        getAudioTracks: () => [mockAudioTrack],
      })
    ),
  },
});

global.MediaRecorder = vi.fn().mockImplementation(() => {
  const instance = Object.create(mockMediaRecorder);
  Object.defineProperty(instance, 'state', {
    get: vi.fn(() => mockMediaRecorder.state),
    set: vi.fn((value) => {
      mockMediaRecorder.state = value;
    }),
  });
  return instance;
}) as any;

(global.MediaRecorder as any).isTypeSupported = vi.fn(() => true);

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: true,
  interimResults: true,
  lang: 'ko-KR',
};

(global as any).webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition);

describe('Recording BeforeUnload Test', () => {
  let queryClient: QueryClient;
  let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null;
  let visibilityChangeHandler: (() => void) | null = null;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock transcription API
    vi.mocked(transcriptionApi.createSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      title: 'Auto-saved recording',
      duration: 5,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(transcriptionApi.saveTranscript).mockResolvedValue({
      id: 'segment-1',
      sessionId: 'session-1',
      text: '',
      startTime: 0,
      endTime: 0,
      confidence: 1,
      isPartial: false,
      language: 'ko',
      words: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(transcriptionApi.saveFullAudio).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      title: 'Auto-saved recording',
      duration: 5,
      status: 'completed',
      fullAudioUrl: 'https://example.com/audio.webm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Capture beforeunload handler
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'beforeunload') {
        beforeUnloadHandler = handler as (event: BeforeUnloadEvent) => void;
      } else if (event === 'visibilitychange') {
        visibilityChangeHandler = handler as () => void;
      }
      return originalAddEventListener.call(window, event, handler as any);
    });

    // Mock removeEventListener
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    beforeUnloadHandler = null;
    visibilityChangeHandler = null;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // TODO: 이벤트 핸들러 캡처 방식 개선 필요
  test.skip('5. 녹음 중 새로 고침시 기존 녹음에 대한 저장 여부를 물어본다', async () => {
    const { result } = renderHook(() => useRecording('test-note-1'), { wrapper });

    // 녹음 시작
    await result.current.startRecording();

    // MediaRecorder.start가 호출되었는지 확인
    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    // beforeunload 핸들러가 등록되었는지 확인
    expect(beforeUnloadHandler).toBeTruthy();

    // beforeunload 이벤트 시뮬레이션
    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;

    beforeUnloadHandler!(mockEvent);

    // 이벤트가 preventDefault되고 returnValue가 설정되었는지 확인
    // Chrome 최신 표준에서는 returnValue를 빈 문자열로 설정
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.returnValue).toBe('');
  });

  // TODO: visibilitychange 핸들러 캡처 방식 개선 필요
  test.skip('녹음 중 탭을 숨기면 자동으로 저장된다', async () => {
    const { result } = renderHook(() => useRecording('test-note-1'), { wrapper });

    // 녹음 시작
    await result.current.startRecording();

    // MediaRecorder 상태를 recording으로 설정
    mockMediaRecorder.state = 'recording';

    // 녹음이 시작되었는지 확인
    await waitFor(() => {
      expect(result.current.isRecording).toBe(true);
    });

    // visibilitychange 핸들러가 등록되었는지 확인
    expect(visibilityChangeHandler).toBeTruthy();

    // document.hidden을 true로 설정 (탭이 숨겨짐)
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: true,
    });

    // visibilitychange 이벤트 시뮬레이션
    visibilityChangeHandler!();

    // 자동 저장이 시작되었는지 확인 (stopRecording 호출 확인)
    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    }, { timeout: 2000 });

    // ondataavailable 이벤트 시뮬레이션 (오디오 데이터 수신)
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    if (mockMediaRecorder.ondataavailable) {
      mockMediaRecorder.ondataavailable({ data: mockBlob } as BlobEvent);
    }

    // onstop 이벤트 시뮬레이션 (녹음 종료)
    mockMediaRecorder.state = 'inactive';
    if (mockMediaRecorder.onstop) {
      mockMediaRecorder.onstop(new Event('stop'));
    }

    // 자동 저장 API 호출 확인 - createSession은 (title, noteId) 인자를 받음
    await waitFor(() => {
      expect(transcriptionApi.createSession).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}_\d{2}_\d{2}_\d{2}:\d{2}:\d{2}$/),
        'test-note-1'
      );
    }, { timeout: 3000 });
  });

  // TODO: 이벤트 핸들러 캡처 방식 개선 필요
  test.skip('녹음이 끝난 후에는 beforeunload 경고가 표시되지 않는다', async () => {
    const { result } = renderHook(() => useRecording('test-note-1'), { wrapper });

    // 녹음 시작
    await result.current.startRecording();

    // MediaRecorder 상태를 recording으로 변경
    mockMediaRecorder.state = 'recording';

    await waitFor(() => {
      expect(result.current.isRecording).toBe(true);
    });

    // ondataavailable 이벤트 시뮬레이션
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    if (mockMediaRecorder.ondataavailable) {
      mockMediaRecorder.ondataavailable({ data: mockBlob } as BlobEvent);
    }

    // stopRecording 호출 (비동기로 시작만 함)
    result.current.stopRecording('테스트 녹음');

    // onstop 이벤트 시뮬레이션
    mockMediaRecorder.state = 'inactive';
    if (mockMediaRecorder.onstop) {
      mockMediaRecorder.onstop(new Event('stop'));
    }

    // 녹음이 끝났는지 확인
    await waitFor(() => {
      expect(result.current.isRecording).toBe(false);
    }, { timeout: 3000 });

    // beforeunload 이벤트 시뮬레이션
    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;

    if (beforeUnloadHandler) {
      beforeUnloadHandler(mockEvent);
    }

    // preventDefault가 호출되지 않았는지 확인 (녹음이 끝났으므로)
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockEvent.returnValue).toBe('');
  });
});

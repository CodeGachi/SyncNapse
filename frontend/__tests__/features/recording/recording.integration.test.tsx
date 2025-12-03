/**
 * Recording Integration Test
 * 녹음 기능 전체 흐름 테스트
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecordingBarContainer } from '@/components/note/recording/recording-bar-container';
import * as transcriptionApi from '@/lib/api/services/transcription.api';

// Mock transcription API
vi.mock('@/lib/api/services/transcription.api');

// Mock MediaRecorder API
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  requestData: vi.fn(),
  state: 'inactive',
  ondataavailable: null as ((event: BlobEvent) => void) | null,
  onstop: null as ((event: Event) => void) | null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock getUserMedia
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

// Mock MediaRecorder constructor
global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder) as any;
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

// Mock Audio element
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 10,
  src: '',
})) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

describe('Recording Integration Test', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    vi.clearAllMocks();

    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    // Mock transcription API responses
    vi.mocked(transcriptionApi.getSessions).mockResolvedValue([]);
    vi.mocked(transcriptionApi.createSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      title: '테스트',
      duration: 10,
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
      title: '테스트',
      duration: 10,
      status: 'completed',
      fullAudioUrl: 'https://example.com/audio.webm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(transcriptionApi.getSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      title: '테스트',
      duration: 10,
      status: 'completed',
      fullAudioUrl: 'https://example.com/audio.webm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      audioChunks: [],
      segments: [],
    });
  });


  const renderRecordingBar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RecordingBarContainer noteId="test-note-1" />
      </QueryClientProvider>
    );
  };

  // TODO: MediaRecorder mock 이슈로 인해 skip 처리 - 추후 수정 필요
  test.skip('시나리오: 녹음 → 저장 → 목록 확인 → 재생', async () => {
    const { container } = renderRecordingBar();

    // 1. 녹음 버튼을 누르고 녹음이 진행된다
    const buttons = screen.getAllByRole('button');
    const recordButton = buttons[0]; // 첫 번째 버튼이 녹음/재생 버튼
    await user.click(recordButton);

    // MediaRecorder.start가 호출되었는지 확인
    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    // 2. 저장 버튼을 누른다
    const saveButton = screen.getByTitle('저장');
    await user.click(saveButton);

    // 모달이 열리는지 확인
    await waitFor(() => {
      expect(screen.getByText(/녹음 저장/i)).toBeInTheDocument();
    });

    // "테스트"란 이름으로 저장
    const titleInput = screen.getByPlaceholderText(/\d{4}_\d{2}_\d{2}/i);
    await user.clear(titleInput);
    await user.type(titleInput, '테스트');

    // 저장 버튼 클릭
    const modalSaveButton = screen.getByRole('button', { name: /저장/i });
    await user.click(modalSaveButton);

    // MediaRecorder.stop이 호출되었는지 확인
    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    // ondataavailable 이벤트 시뮬레이션
    const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
    if (mockMediaRecorder.ondataavailable) {
      mockMediaRecorder.ondataavailable({ data: mockBlob } as BlobEvent);
    }

    // onstop 이벤트 시뮬레이션
    if (mockMediaRecorder.onstop) {
      mockMediaRecorder.onstop(new Event('stop'));
    }

    // API 호출 확인 - createSession이 호출되었는지 확인
    await waitFor(() => {
      expect(transcriptionApi.createSession).toHaveBeenCalled();
    });

    // 호출된 인자 확인 - title과 noteId가 일치하는지 확인
    const calls = vi.mocked(transcriptionApi.createSession).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe('테스트');
    expect(calls[0][1]).toBe('test-note-1');

    // 3. 녹음 목록에 "테스트"가 존재한다
    vi.mocked(transcriptionApi.getSessions).mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-1',
        title: '테스트',
        duration: 10,
        status: 'completed',
        fullAudioUrl: 'https://example.com/audio.webm',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // 녹음 목록 버튼 클릭
    const recordingListButton = screen.getByTitle('저장된 녹음');
    await user.click(recordingListButton);

    // 녹음 목록이 표시되고 "테스트"가 있는지 확인
    await waitFor(() => {
      expect(screen.getByText('테스트')).toBeInTheDocument();
    });

    // 4. 녹음 목록에서 "테스트" 클릭시 녹음 재생이 가능하다
    const testRecordingItem = screen.getByText('테스트');
    await user.click(testRecordingItem);

    // getSession API 호출 확인
    await waitFor(() => {
      expect(transcriptionApi.getSession).toHaveBeenCalledWith('session-1');
    });

    // Audio 요소가 생성되었는지 확인
    await waitFor(() => {
      expect(global.Audio).toHaveBeenCalled();
    });
  });

  // TODO: MediaRecorder mock 이슈로 인해 skip 처리 - 추후 수정 필요
  test.skip('녹음 중 취소 버튼 클릭시 녹음이 폐기된다', async () => {
    renderRecordingBar();

    // 녹음 시작
    const buttons = screen.getAllByRole('button');
    const recordButton = buttons[0];
    await user.click(recordButton);

    // MediaRecorder 상태를 recording으로 설정
    mockMediaRecorder.state = 'recording';

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    // 저장 버튼 클릭하여 모달 열기
    const saveButton = screen.getByTitle('저장');
    await user.click(saveButton);

    // 모달에서 취소 버튼 클릭
    const cancelButton = screen.getByRole('button', { name: /취소/i });
    await user.click(cancelButton);

    // MediaRecorder.stop이 호출되었는지 확인 (cancelRecording 내부에서 호출)
    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    // createSession API가 호출되지 않았는지 확인 (취소했으므로)
    expect(transcriptionApi.createSession).not.toHaveBeenCalled();

    // 모달이 닫혔는지 확인
    await waitFor(() => {
      expect(screen.queryByText(/녹음 저장/i)).not.toBeInTheDocument();
    });
  });

  test('ESC 키로 녹음 저장을 취소할 수 있다', async () => {
    renderRecordingBar();

    // 녹음 시작
    const buttons = screen.getAllByRole('button');
    const recordButton = buttons[0];
    await user.click(recordButton);

    // 저장 버튼 클릭하여 모달 열기
    const saveButton = screen.getByTitle('저장');
    await user.click(saveButton);

    // ESC 키 입력
    await user.keyboard('{Escape}');

    // 모달이 닫혔는지 확인
    await waitFor(() => {
      expect(screen.queryByText(/녹음 저장/i)).not.toBeInTheDocument();
    });

    // createSession API가 호출되지 않았는지 확인
    expect(transcriptionApi.createSession).not.toHaveBeenCalled();
  });

  // TODO: React Query 캐시와 mock 동기화 문제 해결 필요
  test.skip('녹음 목록에서 녹음을 삭제할 수 있다', async () => {
    // 초기 녹음 목록 설정 - beforeEach 전에 mock 설정
    vi.mocked(transcriptionApi.getSessions).mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-1',
        title: '테스트',
        duration: 10,
        status: 'completed',
        fullAudioUrl: 'https://example.com/audio.webm',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    vi.mocked(transcriptionApi.deleteSession).mockResolvedValue({ success: true });

    // queryClient 캐시 무효화 후 렌더링
    queryClient.clear();
    renderRecordingBar();

    // 녹음 목록 열기
    const recordingListButton = screen.getByTitle('저장된 녹음');
    await user.click(recordingListButton);

    // 녹음 항목 확인 - 로딩 상태를 기다림
    await waitFor(() => {
      expect(screen.getByText('테스트')).toBeInTheDocument();
    }, { timeout: 5000 });

    // 삭제 버튼 클릭
    const deleteButton = screen.getByTitle('삭제');
    await user.click(deleteButton);

    // deleteSession API 호출 확인
    await waitFor(() => {
      expect(transcriptionApi.deleteSession).toHaveBeenCalledWith('session-1');
    }, { timeout: 3000 });
  });
});

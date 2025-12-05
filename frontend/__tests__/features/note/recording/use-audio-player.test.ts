/**
 * useAudioPlayer 훅 테스트
 *
 * Note: useAudioPlayer는 싱글톤 Audio 인스턴스를 사용하여 복잡한 의존성이 있음.
 * 이 테스트는 기본적인 상태와 함수 반환을 테스트함.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioPlayer } from "@/features/note/recording/use-audio-player";
import * as audioApi from "@/lib/api/services/audio.api";

// Mock stores
const mockAudioPlayerStore = {
  timelineEvents: [],
  currentPageContext: null,
  currentSessionId: null,
  pendingSeekTime: null,
  setTimelineEvents: vi.fn(),
  setCurrentPageContext: vi.fn(),
  setCurrentSessionId: vi.fn(),
  clearTimeline: vi.fn(),
  setPendingSeekTime: vi.fn(),
};

const mockScriptTranslationStore = {
  isEditMode: false,
  editedSegments: {},
  saveRevisionCallback: null,
  setScriptSegments: vi.fn(),
  resetEdits: vi.fn(),
  setEditMode: vi.fn(),
};

vi.mock("@/stores", () => ({
  useScriptTranslationStore: vi.fn(() => mockScriptTranslationStore),
  useAudioPlayerStore: Object.assign(
    vi.fn(() => mockAudioPlayerStore),
    {
      getState: () => mockAudioPlayerStore,
    }
  ),
}));

vi.mock("@/lib/api/services/transcription.api", () => ({
  getSession: vi.fn(),
  getRevisions: vi.fn(),
  getAudioBlobUrl: vi.fn(),
}));

vi.mock("@/lib/api/services/audio.api", () => ({
  getTimelineEvents: vi.fn(),
  getPageContextAtTime: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock HTMLAudioElement 글로벌
class MockAudio {
  src = "";
  currentTime = 0;
  duration = 0;
  paused = true;
  error: { code: number; message: string } | null = null;

  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// 싱글톤 인스턴스를 저장할 변수
let mockAudioInstance: MockAudio;

describe("useAudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioInstance = new MockAudio();

    // 글로벌 Audio 생성자 모킹 - 싱글톤처럼 동작
    vi.stubGlobal("Audio", vi.fn(() => mockAudioInstance));

    // Reset store mocks
    mockAudioPlayerStore.timelineEvents = [];
    mockAudioPlayerStore.currentPageContext = null;
    mockAudioPlayerStore.currentSessionId = null;
    mockAudioPlayerStore.pendingSeekTime = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("초기 상태", () => {
    it("초기 상태 반환", () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentRecordingId).toBeNull();
      expect(result.current.isLoadingSession).toBe(false);
    });
  });

  describe("togglePlay", () => {
    it("재생 상태 토글", () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.togglePlay();
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlay();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe("handleStopPlayback", () => {
    it("재생 중지 및 초기화", () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.handleStopPlayback();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
    });
  });

  describe("resetAudioPlayer", () => {
    it("오디오 플레이어 완전 초기화", () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.resetAudioPlayer();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.currentRecordingId).toBeNull();
      expect(mockAudioPlayerStore.clearTimeline).toHaveBeenCalled();
    });
  });

  describe("seekTo", () => {
    it("특정 시간으로 점프", () => {
      const { result } = renderHook(() => useAudioPlayer());

      act(() => {
        result.current.seekTo(45);
      });

      expect(result.current.currentTime).toBe(45);
    });
  });

  describe("getPageContextAtTime", () => {
    it("특정 시간의 페이지 컨텍스트 조회", () => {
      const mockContext = { fileId: "file-1", page: 2 };
      vi.mocked(audioApi.getPageContextAtTime).mockReturnValue(mockContext);

      const { result } = renderHook(() => useAudioPlayer());

      const context = result.current.getPageContextAtTime(30);

      expect(audioApi.getPageContextAtTime).toHaveBeenCalled();
      expect(context).toEqual(mockContext);
    });

    it("타임라인 이벤트 없으면 null 반환", () => {
      vi.mocked(audioApi.getPageContextAtTime).mockReturnValue(null);

      const { result } = renderHook(() => useAudioPlayer());

      const context = result.current.getPageContextAtTime(30);

      expect(context).toBeNull();
    });
  });

  describe("반환값", () => {
    it("필요한 모든 값과 함수 반환", () => {
      const { result } = renderHook(() => useAudioPlayer());

      // State
      expect(result.current).toHaveProperty("audioRef");
      expect(result.current).toHaveProperty("isPlaying");
      expect(result.current).toHaveProperty("currentTime");
      expect(result.current).toHaveProperty("duration");
      expect(result.current).toHaveProperty("isLoadingSession");
      expect(result.current).toHaveProperty("currentRecordingId");
      expect(result.current).toHaveProperty("currentAudioRecordingId");
      expect(result.current).toHaveProperty("timelineEvents");
      expect(result.current).toHaveProperty("currentPageContext");

      // Functions
      expect(typeof result.current.togglePlay).toBe("function");
      expect(typeof result.current.handleRecordingSelect).toBe("function");
      expect(typeof result.current.handleStopPlayback).toBe("function");
      expect(typeof result.current.resetAudioPlayer).toBe("function");
      expect(typeof result.current.getPageContextAtTime).toBe("function");
      expect(typeof result.current.seekTo).toBe("function");
    });
  });
});

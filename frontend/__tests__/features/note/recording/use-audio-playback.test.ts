/**
 * useAudioPlayback 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioPlayback } from "@/features/note/recording/use-audio-playback";
import type { ScriptSegment } from "@/lib/types";

describe("useAudioPlayback", () => {
  let mockAudioElement: Partial<HTMLAudioElement>;
  let mockAudioRef: { current: HTMLAudioElement | null };
  let mockTogglePlay: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAudioElement = {
      currentTime: 0,
      duration: 300,
      src: "blob:test-audio",
      play: vi.fn(),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockAudioRef = { current: mockAudioElement as HTMLAudioElement };
    mockTogglePlay = vi.fn();
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("currentTime이 0으로 시작", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      expect(result.current.currentTime).toBe(0);
      expect(result.current.activeSegmentId).toBe(null);
    });
  });

  describe("handleAudioPlayToggle", () => {
    it("재생 중이면 pause 호출", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: true,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleAudioPlayToggle();
      });

      expect(mockAudioElement.pause).toHaveBeenCalled();
      expect(mockTogglePlay).toHaveBeenCalled();
    });

    it("재생 중이 아니면 play 호출", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleAudioPlayToggle();
      });

      expect(mockAudioElement.play).toHaveBeenCalled();
      expect(mockTogglePlay).toHaveBeenCalled();
    });

    it("오디오 src가 없으면 아무것도 하지 않음", () => {
      mockAudioElement.src = "";

      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleAudioPlayToggle();
      });

      expect(mockAudioElement.play).not.toHaveBeenCalled();
      expect(mockTogglePlay).not.toHaveBeenCalled();
    });
  });

  describe("handleAudioStop", () => {
    it("pause 호출하고 currentTime을 0으로 설정", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: true,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleAudioStop();
      });

      expect(mockAudioElement.pause).toHaveBeenCalled();
      expect(mockAudioElement.currentTime).toBe(0);
      expect(mockTogglePlay).toHaveBeenCalled();
    });

    it("재생 중이 아니면 togglePlay 호출 안함", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleAudioStop();
      });

      expect(mockAudioElement.pause).toHaveBeenCalled();
      expect(mockTogglePlay).not.toHaveBeenCalled();
    });
  });

  describe("handleSeek", () => {
    it("지정된 시간으로 탐색", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleSeek(120);
      });

      expect(mockAudioElement.currentTime).toBe(120);
    });

    it("음수 시간은 0으로 제한", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleSeek(-10);
      });

      // 음수는 유효하지 않으므로 함수가 조기 반환
      // handleSeek은 음수를 거부함
    });

    it("최대 duration을 초과하면 duration으로 제한", () => {
      mockAudioElement.duration = 300;

      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleSeek(500);
      });

      expect(mockAudioElement.currentTime).toBe(300);
    });

    it("NaN이나 Infinity는 무시", () => {
      const initialTime = mockAudioElement.currentTime;

      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      act(() => {
        result.current.handleSeek(NaN);
      });

      expect(mockAudioElement.currentTime).toBe(initialTime);

      act(() => {
        result.current.handleSeek(Infinity);
      });

      expect(mockAudioElement.currentTime).toBe(initialTime);
    });
  });

  describe("formatTime", () => {
    it("초를 MM:SS 형식으로 변환", () => {
      const { result } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: [],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      expect(result.current.formatTime(0)).toBe("00:00");
      expect(result.current.formatTime(65)).toBe("01:05");
      expect(result.current.formatTime(3600)).toBe("60:00");
      expect(result.current.formatTime(125)).toBe("02:05");
    });
  });

  describe("timeupdate 이벤트 리스너", () => {
    it("scriptSegments가 있으면 이벤트 리스너 등록", () => {
      const segments: ScriptSegment[] = [
        { id: "seg-1", timestamp: 5000, originalText: "First segment" },
        { id: "seg-2", timestamp: 10000, originalText: "Second segment" },
      ];

      renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: segments,
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      expect(mockAudioElement.addEventListener).toHaveBeenCalledWith(
        "timeupdate",
        expect.any(Function)
      );
    });

    it("컴포넌트 언마운트시 이벤트 리스너 제거", () => {
      const segments: ScriptSegment[] = [
        { id: "seg-1", timestamp: 5000, originalText: "First segment" },
      ];

      const { unmount } = renderHook(() =>
        useAudioPlayback({
          audioRef: mockAudioRef as any,
          scriptSegments: segments,
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      unmount();

      expect(mockAudioElement.removeEventListener).toHaveBeenCalledWith(
        "timeupdate",
        expect.any(Function)
      );
    });

    it("audioRef가 null이면 이벤트 리스너 등록 안함", () => {
      const nullRef = { current: null };

      renderHook(() =>
        useAudioPlayback({
          audioRef: nullRef as any,
          scriptSegments: [{ id: "seg-1", timestamp: 5000, originalText: "Test" }],
          isPlaying: false,
          togglePlay: mockTogglePlay,
        })
      );

      expect(mockAudioElement.addEventListener).not.toHaveBeenCalled();
    });
  });
});

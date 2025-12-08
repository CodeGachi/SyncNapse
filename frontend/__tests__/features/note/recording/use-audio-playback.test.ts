/**
 * useAudioPlayback 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioPlayback } from "@/features/note/recording/use-audio-playback";

beforeEach(() => { vi.clearAllMocks(); });

describe("useAudioPlayback", () => {
  const createMockAudioRef = () => ({
    current: { currentTime: 0, duration: 300, src: "blob:test", play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as any,
  });

  it("초기 상태", () => {
    const { result } = renderHook(() => useAudioPlayback({ audioRef: createMockAudioRef(), scriptSegments: [], isPlaying: false, togglePlay: vi.fn() }));
    expect(result.current.currentTime).toBe(0);
    expect(result.current.activeSegmentId).toBe(null);
  });

  it("handleAudioPlayToggle - 재생", () => {
    const audioRef = createMockAudioRef();
    const togglePlay = vi.fn();
    const { result } = renderHook(() => useAudioPlayback({ audioRef, scriptSegments: [], isPlaying: false, togglePlay }));
    act(() => { result.current.handleAudioPlayToggle(); });
    expect(audioRef.current.play).toHaveBeenCalled();
    expect(togglePlay).toHaveBeenCalled();
  });

  it("handleSeek으로 시간 탐색", () => {
    const audioRef = createMockAudioRef();
    const { result } = renderHook(() => useAudioPlayback({ audioRef, scriptSegments: [], isPlaying: false, togglePlay: vi.fn() }));
    act(() => { result.current.handleSeek(120); });
    expect(audioRef.current.currentTime).toBe(120);
  });

  it("formatTime으로 시간 포맷", () => {
    const { result } = renderHook(() => useAudioPlayback({ audioRef: createMockAudioRef(), scriptSegments: [], isPlaying: false, togglePlay: vi.fn() }));
    expect(result.current.formatTime(65)).toBe("01:05");
  });
});

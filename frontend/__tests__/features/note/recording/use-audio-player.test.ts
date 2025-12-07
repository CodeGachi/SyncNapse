/**
 * useAudioPlayer 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioPlayer } from "@/features/note/recording/use-audio-player";

beforeEach(() => { vi.clearAllMocks(); });

describe("useAudioPlayer", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useAudioPlayer());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });

  it("togglePlay로 재생 토글", () => {
    const { result } = renderHook(() => useAudioPlayer());
    act(() => { result.current.togglePlay(); });
    expect(result.current.isPlaying).toBe(true);
  });
});

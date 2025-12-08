/**
 * useScriptPanel 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScriptPanel } from "@/features/note/right-panel/use-script-panel";

vi.mock("@/lib/api/services/audio.api", () => ({
  getPageContextAtTime: vi.fn(() => ({ fileId: "file-1", page: 1 })),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("useScriptPanel", () => {
  it("초기 currentTime이 0", () => {
    const { result } = renderHook(() => useScriptPanel({ timelineEvents: [] }));
    expect(result.current.currentTime).toBe(0);
  });

  it("handleSegmentClick으로 시간 설정", async () => {
    const mockAudioRef = {
      current: {
        currentTime: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLAudioElement
    };
    const { result } = renderHook(() => useScriptPanel({
      audioRef: mockAudioRef,
      timelineEvents: [],
    }));
    act(() => { result.current.handleSegmentClick(5000); });
    expect(mockAudioRef.current.currentTime).toBe(5);
  });

  it("handleWordClick으로 시간 설정", () => {
    const mockAudioRef = {
      current: {
        currentTime: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLAudioElement
    };
    const { result } = renderHook(() => useScriptPanel({
      audioRef: mockAudioRef,
      timelineEvents: [],
    }));
    act(() => { result.current.handleWordClick(7.5, { stopPropagation: vi.fn() } as any); });
    expect(mockAudioRef.current.currentTime).toBe(7.5);
  });
});

/**
 * useRecordingTimeline 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRecordingTimeline } from "@/features/note/recording/use-recording-timeline";

vi.mock("@/lib/api/services/audio.api", () => ({ addTimelineEvent: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("useRecordingTimeline", () => {
  it("녹음 중 아닐 때 초기 상태", () => {
    const { result } = renderHook(() => useRecordingTimeline({
      isRecording: false, recordingTime: 0, audioRecordingId: null, currentBackendId: "file-1", currentPage: 1,
    }));
    expect(typeof result.current.addTimelineEvent).toBe("function");
  });

  it("녹음 중일 때 addTimelineEvent 사용 가능", () => {
    const { result } = renderHook(() => useRecordingTimeline({
      isRecording: true, recordingTime: 10, audioRecordingId: "rec-1", currentBackendId: "file-1", currentPage: 1,
    }));
    expect(typeof result.current.addTimelineEvent).toBe("function");
  });
});

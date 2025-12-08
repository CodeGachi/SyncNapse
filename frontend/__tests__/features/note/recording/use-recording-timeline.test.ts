import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/api/services/audio.api", () => ({ addTimelineEvent: vi.fn() }));

import { useRecordingTimeline } from "@/features/note/recording/use-recording-timeline";

describe("useRecordingTimeline", () => {
  it("addTimelineEvent 함수 반환", () => {
    const { result } = renderHook(() => useRecordingTimeline({
      isRecording: false, recordingTime: 0, audioRecordingId: null, currentBackendId: "file-1", currentPage: 1,
    }));
    expect(typeof result.current.addTimelineEvent).toBe("function");
  });
});

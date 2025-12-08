/**
 * useScriptRevision 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScriptRevision } from "@/features/note/right-panel/use-script-revision";
import type { ScriptSegment } from "@/lib/types";

const mockSaveRevision = vi.fn();
const mockGetSession = vi.fn();
const mockGetRevisions = vi.fn();

vi.mock("@/lib/api/services/transcription.api", () => ({
  saveRevision: (...args: unknown[]) => mockSaveRevision(...args),
  getSession: (id: string) => mockGetSession(id),
  getRevisions: (id: string) => mockGetRevisions(id),
}));


describe("useScriptRevision", () => {
  const mockSetScriptSegments = vi.fn();
  const defaultSegments: ScriptSegment[] = [
    { id: "seg-1", timestamp: 0, originalText: "Original text 1", translatedText: undefined, isPartial: false },
    { id: "seg-2", timestamp: 5000, originalText: "Original text 2", translatedText: undefined, isPartial: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveRevision.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({
      segments: [
        { id: "seg-1", text: "Original text 1", startTime: 0, words: [] },
        { id: "seg-2", text: "Original text 2", startTime: 5, words: [] },
      ],
    });
    mockGetRevisions.mockResolvedValue([]);
  });

  it("리비전 저장 및 리로드", async () => {
    const { result } = renderHook(() =>
      useScriptRevision({ scriptSegments: defaultSegments, setScriptSegments: mockSetScriptSegments })
    );

    expect(typeof result.current.handleSaveRevision).toBe("function");

    await act(async () => {
      await result.current.handleSaveRevision("session-123", { "seg-1": "Edited text 1", "seg-2": "Edited text 2" });
    });

    expect(mockSaveRevision).toHaveBeenCalledWith(
      "session-123",
      expect.objectContaining({
        segments: expect.arrayContaining([
          expect.objectContaining({ id: "seg-1", editedText: "Edited text 1" }),
          expect.objectContaining({ id: "seg-2", editedText: "Edited text 2" }),
        ]),
      })
    );
    expect(mockGetSession).toHaveBeenCalledWith("session-123");
    expect(mockGetRevisions).toHaveBeenCalledWith("session-123");
  });

  it("리비전 적용 및 에러 처리", async () => {
    mockGetRevisions.mockResolvedValue([{ content: { segments: [{ id: "seg-1", editedText: "Latest" }] } }]);

    const { result } = renderHook(() =>
      useScriptRevision({ scriptSegments: defaultSegments, setScriptSegments: mockSetScriptSegments })
    );

    await act(async () => {
      await result.current.handleSaveRevision("session-123", { "seg-1": "Edited" });
    });
    expect(mockSetScriptSegments).toHaveBeenCalled();

    // 리로드 실패해도 에러 안 던짐
    mockGetSession.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      await result.current.handleSaveRevision("session-123", { "seg-1": "Edited" });
    });
    expect(mockSaveRevision).toHaveBeenCalled();
  });
});

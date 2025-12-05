/**
 * useScriptPanel 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScriptPanel } from "@/features/note/right-panel/use-script-panel";
import type { AudioTimelineEvent } from "@/lib/api/services/audio.api";
import type { WordWithTime } from "@/lib/types";

// Mock audio API
vi.mock("@/lib/api/services/audio.api", () => ({
  getPageContextAtTime: vi.fn((events, time) => {
    // 간단한 구현: 해당 시간에 맞는 페이지 컨텍스트 반환
    for (const event of events) {
      if (event.type === "page_change" && time >= event.timestamp) {
        return {
          fileId: event.fileId,
          page: event.page,
        };
      }
    }
    return null;
  }),
}));

// 완전한 HTMLAudioElement mock 생성
const createMockAudioRef = () => {
  const mockAudio = {
    currentTime: 0,
    duration: 300,
    paused: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
  };
  return { current: mockAudio as unknown as HTMLAudioElement };
};

describe("useScriptPanel", () => {
  const mockTimelineEvents: AudioTimelineEvent[] = [
    { type: "page_change", timestamp: 0, fileId: "file-1", page: 1 },
    { type: "page_change", timestamp: 10, fileId: "file-1", page: 2 },
    { type: "page_change", timestamp: 20, fileId: "file-2", page: 1 },
  ];

  const mockFiles = [
    { id: "local-1", name: "short.pdf", backendId: "file-1" },
    { id: "local-2", name: "another.pdf", backendId: "file-2" },
    { id: "local-3", name: "very-long-file-name-that-should-be-truncated.pdf", backendId: "file-3" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("currentTime이 0으로 시작", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
        })
      );

      expect(result.current.currentTime).toBe(0);
    });
  });

  describe("handleSegmentClick", () => {
    it("오디오 시간을 밀리초에서 초로 변환하여 설정", () => {
      const mockAudioRef = createMockAudioRef();
      const mockOnPageContextClick = vi.fn();

      const { result } = renderHook(() =>
        useScriptPanel({
          audioRef: mockAudioRef,
          timelineEvents: mockTimelineEvents,
          onPageContextClick: mockOnPageContextClick,
        })
      );

      act(() => {
        result.current.handleSegmentClick(5000); // 5000ms = 5초
      });

      expect(mockAudioRef.current.currentTime).toBe(5);
    });

    it("페이지 컨텍스트 콜백 호출", () => {
      const mockAudioRef = createMockAudioRef();
      const mockOnPageContextClick = vi.fn();

      const { result } = renderHook(() =>
        useScriptPanel({
          audioRef: mockAudioRef,
          timelineEvents: mockTimelineEvents,
          onPageContextClick: mockOnPageContextClick,
        })
      );

      act(() => {
        result.current.handleSegmentClick(15000); // 15초
      });

      expect(mockOnPageContextClick).toHaveBeenCalled();
    });

    it("audioRef가 없어도 에러 없이 동작", () => {
      const mockOnPageContextClick = vi.fn();

      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          onPageContextClick: mockOnPageContextClick,
        })
      );

      expect(() => {
        act(() => {
          result.current.handleSegmentClick(5000);
        });
      }).not.toThrow();
    });
  });

  describe("handleWordClick", () => {
    it("이벤트 전파 중지", () => {
      const mockAudioRef = createMockAudioRef();
      const mockStopPropagation = vi.fn();

      const { result } = renderHook(() =>
        useScriptPanel({
          audioRef: mockAudioRef,
          timelineEvents: mockTimelineEvents,
        })
      );

      act(() => {
        result.current.handleWordClick(5, {
          stopPropagation: mockStopPropagation,
        } as unknown as React.MouseEvent);
      });

      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("오디오 시간 설정", () => {
      const mockAudioRef = createMockAudioRef();

      const { result } = renderHook(() =>
        useScriptPanel({
          audioRef: mockAudioRef,
          timelineEvents: mockTimelineEvents,
        })
      );

      act(() => {
        result.current.handleWordClick(7.5, {
          stopPropagation: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(mockAudioRef.current.currentTime).toBe(7.5);
    });
  });

  describe("handlePageBadgeClick", () => {
    it("이벤트 전파 중지", () => {
      const mockOnPageContextClick = vi.fn();
      const mockStopPropagation = vi.fn();

      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          onPageContextClick: mockOnPageContextClick,
        })
      );

      act(() => {
        result.current.handlePageBadgeClick(
          { fileId: "file-1", page: 1 },
          { stopPropagation: mockStopPropagation } as unknown as React.MouseEvent
        );
      });

      expect(mockStopPropagation).toHaveBeenCalled();
    });

    it("페이지 컨텍스트 콜백 호출", () => {
      const mockOnPageContextClick = vi.fn();

      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          onPageContextClick: mockOnPageContextClick,
        })
      );

      const context = { fileId: "file-1", page: 2 };

      act(() => {
        result.current.handlePageBadgeClick(context, {
          stopPropagation: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(mockOnPageContextClick).toHaveBeenCalledWith(context);
    });
  });

  describe("getCurrentWord", () => {
    it("현재 시간에 해당하는 워드 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
        })
      );

      const words: WordWithTime[] = [
        { word: "Hello", startTime: 0, endTime: 0.5 },
        { word: "world", startTime: 0.5, endTime: 1.0 },
        { word: "test", startTime: 1.0, endTime: 1.5 },
      ];

      // currentTime이 0이므로 첫 번째 워드 반환
      const currentWord = result.current.getCurrentWord(words);
      expect(currentWord).toEqual({ word: "Hello", startTime: 0, endTime: 0.5 });
    });

    it("해당하는 워드가 없으면 null 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
        })
      );

      const words: WordWithTime[] = [
        { word: "Hello", startTime: 5, endTime: 5.5 },
        { word: "world", startTime: 5.5, endTime: 6.0 },
      ];

      // currentTime이 0이므로 해당 워드 없음
      const currentWord = result.current.getCurrentWord(words);
      expect(currentWord).toBe(null);
    });
  });

  describe("getSegmentPageContext", () => {
    it("밀리초를 초로 변환하여 페이지 컨텍스트 조회", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
        })
      );

      const context = result.current.getSegmentPageContext(15000); // 15초
      expect(context).toBeDefined();
    });

    it("타임라인 이벤트가 없으면 null 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: [],
        })
      );

      const context = result.current.getSegmentPageContext(5000);
      expect(context).toBe(null);
    });
  });

  describe("getFileNameByBackendId", () => {
    it("backendId로 파일 이름 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          files: mockFiles,
        })
      );

      // 15자 이하 파일명은 그대로 반환
      expect(result.current.getFileNameByBackendId("file-1")).toBe("short.pdf");
      expect(result.current.getFileNameByBackendId("file-2")).toBe("another.pdf");
    });

    it("긴 파일 이름은 잘라서 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          files: mockFiles,
        })
      );

      const truncatedName = result.current.getFileNameByBackendId("file-3");
      expect(truncatedName).toBe("very-long-fi...");
    });

    it("fileId가 undefined면 null 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          files: mockFiles,
        })
      );

      expect(result.current.getFileNameByBackendId(undefined)).toBe(null);
    });

    it("존재하지 않는 fileId면 null 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          files: mockFiles,
        })
      );

      expect(result.current.getFileNameByBackendId("nonexistent")).toBe(null);
    });

    it("files가 비어있으면 null 반환", () => {
      const { result } = renderHook(() =>
        useScriptPanel({
          timelineEvents: mockTimelineEvents,
          files: [],
        })
      );

      expect(result.current.getFileNameByBackendId("file-1")).toBe(null);
    });
  });
});

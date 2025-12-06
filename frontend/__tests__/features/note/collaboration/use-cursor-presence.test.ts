/**
 * use-cursor-presence 테스트
 * 커서 Presence 훅 (Liveblocks 실시간 버전)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// PointerEvent polyfill for JSDOM
class MockPointerEvent extends MouseEvent {
  constructor(type: string, params: PointerEventInit = {}) {
    super(type, params);
  }
}
global.PointerEvent = MockPointerEvent as any;

// Mock Liveblocks
const mockUpdateMyPresence = vi.fn();
const mockOthers: any[] = [];

vi.mock("@/lib/liveblocks", () => ({
  useUpdateMyPresence: () => mockUpdateMyPresence,
  useOthers: () => mockOthers,
}));

import {
  useCursorBroadcast,
  useOthersCursors,
} from "@/features/note/collaboration/use-cursor-presence";

describe("useCursorBroadcast", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // 컨테이너 생성
    container = document.createElement("div");
    container.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("커서 위치 업데이트", () => {
    it("마우스 이동 시 Presence 업데이트", () => {
      const containerRef = { current: container };

      renderHook(() => useCursorBroadcast(containerRef, false, true));

      // pointermove 이벤트 시뮬레이션
      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(mockUpdateMyPresence).toHaveBeenCalledWith({
        cursor: { x: 100, y: 200 },
        isDrawingMode: false,
      });
    });

    it("마우스 leave 시 커서 null", () => {
      const containerRef = { current: container };

      renderHook(() => useCursorBroadcast(containerRef, false, true));

      const event = new PointerEvent("pointerleave", { bubbles: true });
      container.dispatchEvent(event);

      expect(mockUpdateMyPresence).toHaveBeenCalledWith({ cursor: null });
    });

    it("드로잉 모드 변경 시 Presence 반영", () => {
      const containerRef = { current: container };

      renderHook(() => useCursorBroadcast(containerRef, true, true));

      const event = new PointerEvent("pointermove", {
        clientX: 50,
        clientY: 50,
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(mockUpdateMyPresence).toHaveBeenCalledWith({
        cursor: { x: 50, y: 50 },
        isDrawingMode: true,
      });
    });

    it("컨테이너 영역 외부에서는 업데이트하지 않음", () => {
      const containerRef = { current: container };
      container.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        top: 100,
        width: 800,
        height: 600,
        right: 900,
        bottom: 700,
        x: 100,
        y: 100,
        toJSON: () => {},
      }));

      renderHook(() => useCursorBroadcast(containerRef, false, true));

      // 컨테이너 왼쪽 외부 좌표
      const event = new PointerEvent("pointermove", {
        clientX: 50,
        clientY: 150,
        bubbles: true,
      });
      container.dispatchEvent(event);

      // 영역 외부이므로 호출되지 않음
      expect(mockUpdateMyPresence).not.toHaveBeenCalled();
    });
  });

  describe("enabled 파라미터", () => {
    it("enabled=false일 때 이벤트 리스너 등록 안함", () => {
      const containerRef = { current: container };
      const addEventListenerSpy = vi.spyOn(container, "addEventListener");

      renderHook(() => useCursorBroadcast(containerRef, false, false));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it("enabled=true일 때 이벤트 리스너 등록", () => {
      const containerRef = { current: container };
      const addEventListenerSpy = vi.spyOn(container, "addEventListener");

      renderHook(() => useCursorBroadcast(containerRef, false, true));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pointermove",
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pointerleave",
        expect.any(Function)
      );
    });
  });

  describe("cleanup", () => {
    it("언마운트 시 이벤트 리스너 제거 및 커서 null", () => {
      const containerRef = { current: container };
      const removeEventListenerSpy = vi.spyOn(container, "removeEventListener");

      const { unmount } = renderHook(() =>
        useCursorBroadcast(containerRef, false, true)
      );
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "pointermove",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "pointerleave",
        expect.any(Function)
      );
      expect(mockUpdateMyPresence).toHaveBeenCalledWith({ cursor: null });
    });
  });

  describe("containerRef가 null인 경우", () => {
    it("ref가 null이면 아무 동작 안함", () => {
      const containerRef = { current: null };

      // 에러 없이 렌더링
      expect(() => {
        renderHook(() => useCursorBroadcast(containerRef, false, true));
      }).not.toThrow();
    });
  });
});

describe("useOthersCursors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOthers.length = 0;
  });

  describe("커서 필터링", () => {
    it("커서가 있는 사용자만 반환", () => {
      mockOthers.push(
        {
          connectionId: 1,
          presence: {
            cursor: { x: 10, y: 20 },
            userName: "User1",
            color: "#ff0000",
            isDrawingMode: false,
          },
          info: { role: "student" },
        },
        {
          connectionId: 2,
          presence: {
            cursor: null,
            userName: "User2",
            color: "#00ff00",
            isDrawingMode: false,
          },
          info: { role: "student" },
        },
        {
          connectionId: 3,
          presence: {
            cursor: { x: 30, y: 40 },
            userName: "User3",
            color: "#0000ff",
            isDrawingMode: true,
          },
          info: { role: "educator" },
        }
      );

      const { result } = renderHook(() =>
        useOthersCursors({ educatorOnly: false })
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0].connectionId).toBe(1);
      expect(result.current[1].connectionId).toBe(3);
    });

    it("educatorOnly=true 시 educator만 반환", () => {
      mockOthers.push(
        {
          connectionId: 1,
          presence: {
            cursor: { x: 10, y: 20 },
            userName: "Student",
            color: "#ff0000",
            isDrawingMode: false,
          },
          info: { role: "student" },
        },
        {
          connectionId: 2,
          presence: {
            cursor: { x: 30, y: 40 },
            userName: "Educator",
            color: "#0000ff",
            isDrawingMode: true,
          },
          info: { role: "educator" },
        }
      );

      const { result } = renderHook(() =>
        useOthersCursors({ educatorOnly: true })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe("Educator");
      expect(result.current[0].isDrawingMode).toBe(true);
    });

    it("빈 배열 반환 (커서 없음)", () => {
      mockOthers.push({
        connectionId: 1,
        presence: { cursor: null, userName: "User", color: "#ff0000" },
        info: { role: "educator" },
      });

      const { result } = renderHook(() =>
        useOthersCursors({ educatorOnly: true })
      );

      expect(result.current).toHaveLength(0);
    });

    it("educatorOnly=true인데 educator가 없으면 빈 배열", () => {
      mockOthers.push({
        connectionId: 1,
        presence: {
          cursor: { x: 10, y: 20 },
          userName: "Student",
          color: "#ff0000",
        },
        info: { role: "student" },
      });

      const { result } = renderHook(() =>
        useOthersCursors({ educatorOnly: true })
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe("반환 데이터 형식", () => {
    it("올바른 커서 데이터 구조", () => {
      mockOthers.push({
        connectionId: 1,
        presence: {
          cursor: { x: 100, y: 200 },
          userName: "Test",
          color: "#123456",
          isDrawingMode: true,
        },
        info: { role: "educator" },
      });

      const { result } = renderHook(() =>
        useOthersCursors({ educatorOnly: false })
      );

      expect(result.current[0]).toEqual({
        connectionId: 1,
        x: 100,
        y: 200,
        name: "Test",
        color: "#123456",
        isDrawingMode: true,
      });
    });

    it("isDrawingMode가 없으면 false로 기본값", () => {
      mockOthers.push({
        connectionId: 1,
        presence: {
          cursor: { x: 100, y: 200 },
          userName: "Test",
          color: "#123456",
          // isDrawingMode 없음
        },
        info: { role: "educator" },
      });

      const { result } = renderHook(() =>
        useOthersCursors({ educatorOnly: false })
      );

      expect(result.current[0].isDrawingMode).toBe(false);
    });
  });

  describe("기본값", () => {
    it("educatorOnly 기본값은 false", () => {
      mockOthers.push(
        {
          connectionId: 1,
          presence: {
            cursor: { x: 10, y: 20 },
            userName: "Student",
            color: "#ff0000",
          },
          info: { role: "student" },
        },
        {
          connectionId: 2,
          presence: {
            cursor: { x: 30, y: 40 },
            userName: "Educator",
            color: "#0000ff",
          },
          info: { role: "educator" },
        }
      );

      const { result } = renderHook(() => useOthersCursors({}));

      // 모든 사용자 반환
      expect(result.current).toHaveLength(2);
    });
  });
});

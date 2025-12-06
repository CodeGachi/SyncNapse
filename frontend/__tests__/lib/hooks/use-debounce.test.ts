/**
 * use-debounce 훅 테스트
 * 디바운스된 값 반환
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/lib/hooks/use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 값", () => {
    it("초기값 즉시 반환", () => {
      const { result } = renderHook(() => useDebounce("initial", 300));
      expect(result.current).toBe("initial");
    });

    it("숫자 타입 초기값", () => {
      const { result } = renderHook(() => useDebounce(42, 300));
      expect(result.current).toBe(42);
    });

    it("객체 타입 초기값", () => {
      const initialValue = { name: "test" };
      const { result } = renderHook(() => useDebounce(initialValue, 300));
      expect(result.current).toEqual({ name: "test" });
    });

    it("null 초기값", () => {
      const { result } = renderHook(() => useDebounce(null, 300));
      expect(result.current).toBeNull();
    });
  });

  describe("디바운스 동작", () => {
    it("지연 시간 후 값 업데이트", () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: "initial", delay: 300 } }
      );

      // 값 변경
      rerender({ value: "updated", delay: 300 });

      // 아직 업데이트 안됨
      expect(result.current).toBe("initial");

      // 300ms 경과
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe("updated");
    });

    it("지연 시간 전에는 값 유지", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      // 200ms만 경과 (500ms 미만)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe("initial");
    });

    it("연속 변경 시 마지막 값만 적용", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      // 빠르게 여러 번 변경
      rerender({ value: "first" });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: "second" });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: "third" });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // 아직 initial (마지막 변경부터 300ms 안 지남)
      expect(result.current).toBe("initial");

      // 마지막 변경부터 300ms 경과
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe("third");
    });
  });

  describe("기본 지연 시간", () => {
    it("기본값 300ms", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      // 200ms 경과 - 아직 업데이트 안됨
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe("initial");

      // 100ms 더 경과 (총 300ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe("updated");
    });
  });

  describe("커스텀 지연 시간", () => {
    it("100ms 지연", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe("updated");
    });

    it("1000ms 지연", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 1000),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      // 500ms 경과 - 아직 업데이트 안됨
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe("initial");

      // 500ms 더 경과 (총 1000ms)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe("updated");
    });

    it("0ms 지연", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe("updated");
    });
  });

  describe("지연 시간 변경", () => {
    it("지연 시간 변경 시 새 타이머 적용", () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: "initial", delay: 300 } }
      );

      // 값과 지연 시간 동시 변경
      rerender({ value: "updated", delay: 500 });

      // 300ms 경과 - 아직 업데이트 안됨 (새 지연 시간 500ms)
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("initial");

      // 200ms 더 경과 (총 500ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe("updated");
    });
  });

  describe("다양한 타입", () => {
    it("배열 타입", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: [1, 2, 3] } }
      );

      rerender({ value: [4, 5, 6] });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toEqual([4, 5, 6]);
    });

    it("boolean 타입", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: false } }
      );

      rerender({ value: true });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });

    it("undefined 타입", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: "initial" as string | undefined } }
      );

      rerender({ value: undefined });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe("클린업", () => {
    it("언마운트 시 타이머 정리", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});

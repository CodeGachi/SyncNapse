/**
 * useDebounce 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/lib/hooks/use-debounce";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("useDebounce", () => {
  it("초기값 즉시 반환", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("지연 후 값 업데이트", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );
    rerender({ value: "updated", delay: 300 });
    expect(result.current).toBe("initial");
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("updated");
  });

  it("연속 변경시 마지막 값만 적용", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } }
    );
    rerender({ value: "first" });
    rerender({ value: "second" });
    rerender({ value: "third" });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("third");
  });
});

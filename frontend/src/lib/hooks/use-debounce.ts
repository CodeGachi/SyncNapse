/**
 * Debounce Hook
 * 값이 변경된 후 지정된 시간이 지나야 업데이트됨
 */

import { useState, useEffect } from "react";

/**
 * 디바운스된 값을 반환하는 훅
 *
 * @param value - 디바운스할 값
 * @param delay - 지연 시간 (ms), 기본값 300ms
 * @returns 디바운스된 값
 *
 * @example
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 300);
 *
 * useEffect(() => {
 *   // debouncedQuery가 변경될 때만 API 호출
 *   if (debouncedQuery) {
 *     searchAPI(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

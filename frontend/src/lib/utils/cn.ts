/**
 * UI 유틸리티
 * Tailwind CSS 클래스명 병합
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 조건부 클래스명을 병합하고 Tailwind 충돌을 해결합니다.
 *
 * @example
 * cn("p-4 bg-blue-500", isActive && "p-6 bg-red-500")
 * // 결과: "p-6 bg-red-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

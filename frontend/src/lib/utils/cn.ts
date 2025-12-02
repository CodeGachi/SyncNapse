/**
 * 클래스명 병합 유틸리티
 * clsx와 tailwind-merge를 조합하여 Tailwind CSS 클래스 충돌 해결
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 여러 클래스명을 병합하고 Tailwind CSS 충돌을 해결
 * @param inputs - 클래스명 배열
 * @returns 병합된 클래스명 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

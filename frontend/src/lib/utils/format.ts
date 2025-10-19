/**
 * 포맷팅 유틸리티
 * 파일 크기, 날짜 등의 포맷팅 함수
 */

import { FILE_SIZE_UNITS } from "../constants";

/**
 * 바이트를 사람이 읽기 쉬운 형식으로 변환
 *
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1048576) // "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < FILE_SIZE_UNITS.KB) {
    return `${bytes} B`;
  }
  if (bytes < FILE_SIZE_UNITS.MB) {
    return `${(bytes / FILE_SIZE_UNITS.KB).toFixed(1)} KB`;
  }
  if (bytes < FILE_SIZE_UNITS.GB) {
    return `${(bytes / FILE_SIZE_UNITS.MB).toFixed(1)} MB`;
  }
  return `${(bytes / FILE_SIZE_UNITS.GB).toFixed(2)} GB`;
}

/**
 * 타임스탬프를 한국 시간 형식으로 변환
 *
 * @example
 * formatDate(Date.now()) // "2024.01.15 14:30"
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

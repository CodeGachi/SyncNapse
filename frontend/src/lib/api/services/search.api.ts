/**
 * Search API Service
 * 통합 검색 API 호출 함수
 */

import { apiClient } from "../client";
import type { ApiSearchResponse } from "../types/api.types";

/**
 * 통합 검색 API
 * 노트 제목, 파일명, 음성 전사 텍스트에서 키워드 검색
 *
 * @param query - 검색 키워드
 * @param limit - 각 카테고리별 최대 결과 수 (기본값: 5)
 * @returns 검색 결과 (notes, files, segments)
 */
export async function searchAll(
  query: string,
  limit: number = 5
): Promise<ApiSearchResponse> {
  if (!query.trim()) {
    return { notes: [], files: [], segments: [] };
  }

  return apiClient<ApiSearchResponse>(
    `/search/all?q=${encodeURIComponent(query)}&limit=${limit}`,
    { method: "GET" },
    { cache: false } // 검색은 캐시하지 않음
  );
}

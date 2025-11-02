/**
 * SyncNapse HTTP API 클라이언트
 * 백엔드 API와 통신하기 위한 fetch 래퍼
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * API 요청 헬퍼
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include", // 쿠키 포함 (CORS)
  });

  if (!response.ok) {
    const error: ApiError = {
      message: `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
    };

    try {
      const errorData = await response.json();
      error.message = errorData.message || error.message;
      error.code = errorData.code;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    throw error;
  }

  return response.json();
}

/**
 * Authorization 헤더에 토큰 추가
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
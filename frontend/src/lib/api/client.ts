/**
 * SyncNapse HTTP API 클라이언트 (V2 - 개선된 버전)
 * 백엔드 API와 통신하기 위한 fetch 래퍼
 *
 * 기능:
 * - 요청/응답 인터셉터
 * - 자동 재시도 (exponential backoff)
 * - 요청 중복 제거 및 캐싱
 * - 타임아웃 및 AbortController 지원
 * - 요청/응답 로깅
 */

import { createLogger } from "@/lib/utils/logger";
import { getAccessToken } from "@/lib/auth/token-manager";

const log = createLogger("API");

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// 재시도 설정
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // ms
const DEFAULT_TIMEOUT = 30000; // ms (30초)

// 요청 캐시 (GET 요청만)
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 진행 중인 요청 추적 (중복 제거)
const pendingRequests = new Map<string, Promise<any>>();

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  retryable?: boolean;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  useCache?: boolean; // 캐시된 데이터를 먼저 사용할지 여부
  skipInterceptors?: boolean;
}

/**
 * Request 인터셉터
 */
type RequestInterceptor = (
  config: RequestInit & { url: string }
) => Promise<RequestInit & { url: string }>;

/**
 * Response 인터셉터
 */
type ResponseInterceptor = (response: Response) => Promise<Response>;

/**
 * Error 인터셉터
 */
type ErrorInterceptor = (error: ApiError) => Promise<void> | void;

const interceptors = {
  request: [] as RequestInterceptor[],
  response: [] as ResponseInterceptor[],
  error: [] as ErrorInterceptor[],
};

/**
 * 인터셉터 등록
 */
export function addRequestInterceptor(interceptor: RequestInterceptor) {
  interceptors.request.push(interceptor);
}

export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  interceptors.response.push(interceptor);
}

export function addErrorInterceptor(interceptor: ErrorInterceptor) {
  interceptors.error.push(interceptor);
}

/**
 * Exponential backoff를 사용한 지연
 */
function getBackoffDelay(attempt: number): number {
  return DEFAULT_RETRY_DELAY * Math.pow(2, attempt);
}

/**
 * 재시도 가능한 상태 코드 확인
 */
function isRetryable(status: number): boolean {
  // 429 (Too Many Requests), 500, 502, 503, 504 재시도
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * 캐시 키 생성
 */
function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || "GET";
  return `${method}:${url}`;
}

/**
 * 캐시에서 데이터 확인
 */
function getCachedData(url: string, options?: RequestInit): any | null {
  const key = getCacheKey(url, options);
  const cached = requestCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 만료된 캐시 제거
  if (cached) {
    requestCache.delete(key);
  }

  return null;
}

/**
 * 캐시에 데이터 저장
 */
function setCachedData(url: string, data: any, options?: RequestInit): void {
  const key = getCacheKey(url, options);
  requestCache.set(key, { data, timestamp: Date.now() });
}

/**
 * 타임아웃이 있는 fetch
 */
async function fetchWithTimeout(
  url: string,
  timeout: number,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API 요청 헬퍼 (개선된 버전)
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  config?: RequestConfig
): Promise<T> {
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const retries = config?.retries ?? DEFAULT_RETRY_ATTEMPTS;
  const cache = config?.cache !== false; // 기본값: true
  const useCache = config?.useCache !== false; // 기본값: true

  const url = `${API_BASE_URL}${endpoint}`;
  const method = options?.method || "GET";

  // GET 요청이고 캐시 사용 설정이면 캐시 확인
  if (method === "GET" && useCache && cache) {
    const cachedData = getCachedData(url, options);
    if (cachedData) {
      log.debug(`Cache hit: ${method} ${endpoint}`);
      return cachedData;
    }
  }

  // 중복 요청 제거: 동일한 요청이 진행 중이면 그 Promise 재사용
  const cacheKey = getCacheKey(url, options);
  if (pendingRequests.has(cacheKey) && method === "GET") {
    log.debug(`Request deduplication: ${method} ${endpoint}`);
    return pendingRequests.get(cacheKey)!;
  }

  const requestPromise = performRequest<T>(url, endpoint, options, {
    timeout,
    retries,
    cache,
    skipInterceptors: config?.skipInterceptors,
  });

  // 진행 중인 요청 추적
  pendingRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

/**
 * 실제 요청 수행
 */
async function performRequest<T>(
  url: string,
  endpoint: string,
  options?: RequestInit,
  config?: {
    timeout: number;
    retries: number;
    cache: boolean;
    skipInterceptors?: boolean;
  }
): Promise<T> {
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const skipInterceptors = config?.skipInterceptors ?? false;

  // Get auth token
  const token = getAccessToken();

  let requestConfig: RequestInit & { url: string } = {
    ...options,
    url,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: "include", // 쿠키 포함 (CORS)
  };

  // Request 인터셉터 실행
  if (!skipInterceptors) {
    for (const interceptor of interceptors.request) {
      requestConfig = await interceptor(requestConfig);
    }
  }

  const { url: finalUrl, ...fetchOptions } = requestConfig;

  // 재시도 로직과 함께 요청 수행
  return await retryRequest<T>(finalUrl, fetchOptions, endpoint, {
    timeout,
    retries: config?.retries ?? DEFAULT_RETRY_ATTEMPTS,
    cache: config?.cache ?? true,
    skipInterceptors,
  });
}

/**
 * 재시도 로직을 포함한 요청 수행
 */
async function retryRequest<T>(
  url: string,
  options: RequestInit,
  endpoint: string,
  config: {
    timeout: number;
    retries: number;
    cache: boolean;
    skipInterceptors: boolean;
  }
): Promise<T> {
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      log.debug(
        `${options.method || "GET"} ${endpoint} (attempt ${attempt + 1}/${config.retries + 1})`
      );

      const response = await fetchWithTimeout(url, config.timeout, options);

      // Response 인터셉터 실행
      let finalResponse = response;
      if (!config.skipInterceptors) {
        for (const interceptor of interceptors.response) {
          finalResponse = await interceptor(finalResponse);
        }
      }

      if (!finalResponse.ok) {
        const error: ApiError = {
          message: `HTTP ${finalResponse.status}: ${finalResponse.statusText}`,
          status: finalResponse.status,
          retryable: isRetryable(finalResponse.status),
        };

        try {
          const errorData = await finalResponse.json();
          error.message = errorData.message || error.message;
          error.code = errorData.code;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }

        lastError = error;

        // 재시도 불가능한 에러면 즉시 throw
        if (!error.retryable) {
          throw error;
        }

        // 마지막 시도가 아니면 재시도
        if (attempt < config.retries) {
          const delay = getBackoffDelay(attempt);
          log.warn(
            `Retrying after ${delay}ms: ${options.method || "GET"} ${endpoint}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      const data = await finalResponse.json();

      // 성공한 응답 캐시
      if ((options.method || "GET") === "GET" && config.cache) {
        setCachedData(url, data, options);
      }

      log.debug(`Success: ${options.method || "GET"} ${endpoint}`);
      return data;
    } catch (error) {
      const apiError: ApiError =
        error instanceof Error
          ? {
              message: error.message,
              code: error.name,
            }
          : (error as ApiError);

      // AbortError (타임아웃) 처리
      if (apiError.code === "AbortError") {
        apiError.message = `Request timeout (${config.timeout}ms): ${endpoint}`;
        apiError.retryable = attempt < config.retries;
      }

      lastError = apiError;

      // 재시도 가능하고 마지막 시도가 아니면 계속
      if (
        apiError.retryable !== false &&
        attempt < config.retries
      ) {
        const delay = getBackoffDelay(attempt);
        log.warn(
          `Retrying after ${delay}ms: ${options.method || "GET"} ${endpoint}`,
          apiError
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Error 인터셉터 실행
      if (!config.skipInterceptors) {
        for (const errorInterceptor of interceptors.error) {
          try {
            await errorInterceptor(apiError);
          } catch (e) {
            log.error("Error interceptor failed:", e);
          }
        }
      }

      throw apiError;
    }
  }

  throw (
    lastError ||
    ({
      message: "Request failed",
      status: 0,
    } as ApiError)
  );
}

/**
 * 인증 인터셉터 설정
 * - 자동으로 Authorization 헤더 추가
 * - 토큰 만료 시 자동 갱신
 */
export async function setupAuthInterceptor(): Promise<void> {
  // Request 인터셉터: 자동으로 Authorization 헤더 추가
  addRequestInterceptor(async (config) => {
    // token-manager에서 유효한 토큰 가져오기 (자동 갱신 포함)
    const { getValidAccessToken } = await import("../auth/token-manager");
    const token = await getValidAccessToken();

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  });

  // Error 인터셉터: 401 에러 시 토큰 갱신 및 로그아웃 처리
  addErrorInterceptor(async (error) => {
    if (error.status === 401) {
      log.warn("Unauthorized - clearing tokens");
      const { clearTokens } = await import("../auth/token-manager");
      clearTokens();

      // 로그인 페이지로 리다이렉트 (클라이언트에서만)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  });

  log.debug("Auth interceptors initialized");
}

/**
 * 캐시 초기화
 */
export function clearCache(): void {
  requestCache.clear();
  log.debug("Cache cleared");
}

/**
 * 특정 요청의 캐시 삭제
 */
export function clearCacheByPattern(pattern: RegExp | string): void {
  const regex =
    typeof pattern === "string" ? new RegExp(pattern) : pattern;

  for (const [key] of requestCache) {
    if (regex.test(key)) {
      requestCache.delete(key);
    }
  }

  log.debug(`Cache cleared for pattern: ${pattern}`);
}

/**
 * Get authorization headers
 * Returns Bearer token header if token exists
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
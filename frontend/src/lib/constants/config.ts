/**
 * 애플리케이션 설정 상수
 * 매직 넘버를 중앙 집중화하여 관리
 */

// =============================================================================
// API 설정
// =============================================================================

export const API_CONFIG = {
  /** API 기본 URL (환경변수 우선) */
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "",

  /** 내부 API URL (서버 사이드용) */
  INTERNAL_URL: process.env.INTERNAL_API_URL || "",

  /** API 요청 타임아웃 (ms) */
  TIMEOUT_MS: 30_000,

  /** 재시도 횟수 */
  RETRY_ATTEMPTS: 3,

  /** 재시도 간 지연 시간 (ms) */
  RETRY_DELAY_MS: 1_000,
} as const;

// =============================================================================
// 캐시 설정
// =============================================================================

export const CACHE_CONFIG = {
  /** API 응답 캐시 TTL (ms) - 5분 */
  API_CACHE_TTL_MS: 5 * 60 * 1_000,

  /** API 디스커버리 캐시 TTL (ms) - 5분 */
  DISCOVERY_CACHE_TTL_MS: 5 * 60 * 1_000,

  /** HAL 리소스 캐시 TTL (ms) - 5분 */
  HAL_CACHE_TTL_MS: 5 * 60 * 1_000,

  /** 링크 레지스트리 캐시 TTL (ms) - 10분 */
  LINK_REGISTRY_TTL_MS: 10 * 60 * 1_000,

  /** React Query staleTime (ms) - 5분 */
  QUERY_STALE_TIME_MS: 5 * 60 * 1_000,

  /** React Query gcTime (ms) - 10분 */
  QUERY_GC_TIME_MS: 10 * 60 * 1_000,

  /** 공유 관련 staleTime (ms) - 30초 (실시간성 필요) */
  SHARING_STALE_TIME_MS: 30 * 1_000,

  /** 인증 관련 gcTime (ms) - 30분 */
  AUTH_GC_TIME_MS: 30 * 60 * 1_000,
} as const;

// =============================================================================
// 동기화 설정
// =============================================================================

export const SYNC_CONFIG = {
  /** 동기화 폴링 인터벌 (ms) - 5초 */
  SYNC_INTERVAL_MS: 5_000,

  /** 동기화 요청 타임아웃 (ms) - 30초 */
  SYNC_TIMEOUT_MS: 30_000,

  /** 자동저장 debounce 시간 (ms) - 30초 */
  AUTOSAVE_DEBOUNCE_MS: 30_000,
} as const;

// =============================================================================
// UI 설정
// =============================================================================

export const UI_CONFIG = {
  /** 토스트/알림 표시 시간 (ms) - 3초 */
  TOAST_DURATION_MS: 3_000,

  /** 동기화 상태바 자동 숨김 시간 (ms) - 3초 */
  SYNC_STATUS_AUTO_HIDE_MS: 3_000,

  /** Liveblocks throttle (ms) - 16ms (60fps) */
  LIVEBLOCKS_THROTTLE_MS: 16,

  /** 캔버스 동기화 재시도 지연 (ms) */
  CANVAS_SYNC_RETRY_DELAY_MS: 1_000,
} as const;

// =============================================================================
// 인증 설정
// =============================================================================

export const AUTH_CONFIG = {
  /** 토큰 갱신 버퍼 시간 (초) - 만료 60초 전 갱신 */
  TOKEN_REFRESH_BUFFER_SECONDS: 60,

  /** Mock 인증 지연 시간 (ms) */
  MOCK_AUTH_DELAY_MS: 1_000,
} as const;

// =============================================================================
// 파일 설정
// =============================================================================

export const FILE_CONFIG = {
  /** 파일명 카운터 상한 */
  FILENAME_COUNTER_MAX: 1_000,
} as const;

// =============================================================================
// 음성 인식 설정
// =============================================================================

export const SPEECH_CONFIG = {
  /** 음성 인식 재시도 지연 (ms) */
  RETRY_DELAY_MS: 1_000,
} as const;

// =============================================================================
// 서버 모니터링 설정
// =============================================================================

export const MONITORING_CONFIG = {
  /** 서버 상태 폴링 인터벌 (ms) - 30초 */
  SERVER_POLL_INTERVAL_MS: 30_000,

  /** 테스트 연결 지연 (ms) */
  TEST_CONNECTION_DELAY_MS: 1_000,
} as const;

// =============================================================================
// 외부 라이브러리 버전
// =============================================================================

export const EXTERNAL_LIBS = {
  /** PDF.js 버전 */
  PDFJS_VERSION: "3.11.174",

  /** PDF.js CDN 기본 URL */
  get PDFJS_CDN_URL() {
    return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${this.PDFJS_VERSION}`;
  },

  /** PDF.js 메인 스크립트 URL */
  get PDFJS_SCRIPT_URL() {
    return `${this.PDFJS_CDN_URL}/pdf.min.js`;
  },

  /** PDF.js Worker 스크립트 URL */
  get PDFJS_WORKER_URL() {
    return `${this.PDFJS_CDN_URL}/pdf.worker.min.js`;
  },
} as const;

// =============================================================================
// 환경 체크 유틸리티
// =============================================================================

export const ENV = {
  /** 개발 환경 여부 */
  isDevelopment: process.env.NODE_ENV === "development",

  /** 프로덕션 환경 여부 */
  isProduction: process.env.NODE_ENV === "production",

  /** Mock 인증 사용 여부 */
  useMockAuth: process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true",

  /** Mock API 사용 여부 */
  useMockApi: process.env.NEXT_PUBLIC_USE_MOCK_API === "true",

  /** 로컬 DB 사용 여부 */
  useLocalDb: process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false",
} as const;

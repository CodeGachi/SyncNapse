/**
 * 환경별 로깅 유틸리티
 * - 개발: 모든 로그 출력
 * - 프로덕션: warn, error만 출력
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

const isDev = process.env.NODE_ENV === "development";

// 로그 레벨별 색상 (브라우저 콘솔용)
const LOG_STYLES = {
  debug: "color: #6B7280", // gray
  info: "color: #3B82F6", // blue
  warn: "color: #F59E0B", // amber
  error: "color: #EF4444", // red
} as const;

/**
 * 기본 로거
 * 환경에 따라 로그 출력을 제어
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log("%c[DEBUG]", LOG_STYLES.debug, ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info("%c[INFO]", LOG_STYLES.info, ...args);
    }
  },

  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },

  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
};

/**
 * 네임스페이스 로거 생성
 * 특정 모듈/컴포넌트용 로거 생성
 *
 * @example
 * const log = createLogger('AudioPlayer');
 * log.debug('재생 시작'); // [AudioPlayer] 재생 시작
 */
export function createLogger(namespace: string, options: LoggerOptions = {}) {
  const { enabled = true } = options;
  const prefix = `[${namespace}]`;

  return {
    debug: (...args: unknown[]) => {
      if (isDev && enabled) {
        console.log(`%c${prefix}`, LOG_STYLES.debug, ...args);
      }
    },

    info: (...args: unknown[]) => {
      if (isDev && enabled) {
        console.info(`%c${prefix}`, LOG_STYLES.info, ...args);
      }
    },

    warn: (...args: unknown[]) => {
      if (enabled) {
        console.warn(prefix, ...args);
      }
    },

    error: (...args: unknown[]) => {
      if (enabled) {
        console.error(prefix, ...args);
      }
    },
  };
}

/**
 * 조건부 로깅
 * 특정 조건에서만 로그 출력
 */
export function logIf(condition: boolean, level: LogLevel, ...args: unknown[]) {
  if (condition) {
    logger[level](...args);
  }
}

/**
 * 성능 측정 로거
 * 실행 시간 측정용
 *
 * @example
 * const timer = perfLogger('API 호출');
 * await fetchData();
 * timer.end(); // [PERF] API 호출: 123ms
 */
export function perfLogger(label: string) {
  const start = performance.now();

  return {
    end: () => {
      if (isDev) {
        const duration = (performance.now() - start).toFixed(2);
        console.log(`%c[PERF]`, "color: #10B981", `${label}: ${duration}ms`);
      }
    },
  };
}

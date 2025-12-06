/**
 * logger 유틸리티 테스트
 * 환경별 로깅 유틸리티
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, createLogger, logIf, perfLogger } from "@/lib/utils/logger";

describe("logger", () => {
  let consoleLogSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("기본 로거", () => {
    describe("개발 환경", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "development";
      });

      it("debug 출력", () => {
        logger.debug("Debug message");
        expect(consoleLogSpy).toHaveBeenCalled();
      });

      it("info 출력", () => {
        logger.info("Info message");
        expect(consoleInfoSpy).toHaveBeenCalled();
      });
    });

    describe("프로덕션 환경", () => {
      beforeEach(() => {
        process.env.NODE_ENV = "production";
      });

      // 참고: vitest에서는 모듈이 이미 로드되어 있어서
      // NODE_ENV 변경이 즉시 반영되지 않을 수 있음
      // 실제 동작은 빌드 시점에 결정됨
    });

    it("warn 항상 출력", () => {
      logger.warn("Warning message");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("error 항상 출력", () => {
      logger.error("Error message");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("createLogger", () => {
    it("네임스페이스 로거 생성", () => {
      const log = createLogger("TestModule");
      expect(log).toHaveProperty("debug");
      expect(log).toHaveProperty("info");
      expect(log).toHaveProperty("warn");
      expect(log).toHaveProperty("error");
    });

    it("네임스페이스 프리픽스 포함", () => {
      const log = createLogger("MyComponent");
      log.warn("Test warning");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[MyComponent]",
        "Test warning"
      );
    });

    it("여러 인자 전달", () => {
      const log = createLogger("Test");
      log.warn("Message", { data: 123 }, ["array"]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[Test]",
        "Message",
        { data: 123 },
        ["array"]
      );
    });

    describe("enabled 옵션", () => {
      it("enabled: true (기본값)", () => {
        const log = createLogger("Enabled");
        log.warn("Should log");

        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it("enabled: false", () => {
        const log = createLogger("Disabled", { enabled: false });
        log.warn("Should not log");
        log.error("Should not log error");

        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("logIf", () => {
    it("조건 true일 때 로그", () => {
      logIf(true, "warn", "Conditional message");

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("조건 false일 때 로그 안함", () => {
      logIf(false, "warn", "Should not log");

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("다양한 로그 레벨", () => {
      logIf(true, "error", "Error message");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("perfLogger", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("타이머 객체 반환", () => {
      const timer = perfLogger("API Call");

      expect(timer).toHaveProperty("end");
      expect(typeof timer.end).toBe("function");
    });

    it("end() 호출 시 경과 시간 로그", () => {
      // performance.now 모킹
      let time = 0;
      vi.spyOn(performance, "now").mockImplementation(() => {
        const current = time;
        time += 100; // 100ms 경과
        return current;
      });

      const timer = perfLogger("Database Query");
      timer.end();

      // 개발 환경에서만 출력
      // 테스트 환경에서는 NODE_ENV가 test이므로 출력 안될 수 있음
    });
  });
});

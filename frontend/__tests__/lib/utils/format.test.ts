/**
 * format 유틸리티 테스트
 * 파일 크기, 날짜 등의 포맷팅 함수
 */

import { describe, it, expect } from "vitest";
import { formatFileSize, formatDate } from "@/lib/utils/format";

describe("formatFileSize", () => {
  describe("바이트 단위", () => {
    it("0 바이트", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("1 바이트", () => {
      expect(formatFileSize(1)).toBe("1 B");
    });

    it("512 바이트", () => {
      expect(formatFileSize(512)).toBe("512 B");
    });

    it("1023 바이트 (KB 미만)", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
    });
  });

  describe("킬로바이트 단위", () => {
    it("1 KB", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
    });

    it("1.5 KB", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("512 KB", () => {
      expect(formatFileSize(512 * 1024)).toBe("512.0 KB");
    });

    it("1023 KB (MB 미만)", () => {
      expect(formatFileSize(1023 * 1024)).toBe("1023.0 KB");
    });
  });

  describe("메가바이트 단위", () => {
    it("1 MB", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });

    it("10.5 MB", () => {
      expect(formatFileSize(10.5 * 1024 * 1024)).toBe("10.5 MB");
    });

    it("100 MB", () => {
      expect(formatFileSize(100 * 1024 * 1024)).toBe("100.0 MB");
    });

    it("1023 MB (GB 미만)", () => {
      expect(formatFileSize(1023 * 1024 * 1024)).toBe("1023.0 MB");
    });
  });

  describe("기가바이트 단위", () => {
    it("1 GB", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    });

    it("1.5 GB", () => {
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe("1.50 GB");
    });

    it("10 GB", () => {
      expect(formatFileSize(10 * 1024 * 1024 * 1024)).toBe("10.00 GB");
    });
  });
});

describe("formatDate", () => {
  it("타임스탬프를 한국어 날짜 형식으로 변환", () => {
    // 2024-01-15 14:30:00 UTC
    const timestamp = new Date("2024-01-15T14:30:00Z").getTime();
    const formatted = formatDate(timestamp);

    // 포맷이 날짜와 시간을 포함하는지 확인
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/01/);
    expect(formatted).toMatch(/15/);
  });

  it("현재 시간 포맷팅", () => {
    const now = Date.now();
    const formatted = formatDate(now);

    // 유효한 날짜 문자열인지 확인
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toMatch(/\d{4}/); // 연도 포함
  });

  it("밀리초 타임스탬프 처리", () => {
    const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
    const formatted = formatDate(timestamp);

    expect(formatted).toMatch(/2024/);
  });
});

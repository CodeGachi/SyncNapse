/**
 * format 유틸리티 테스트
 */

import { describe, it, expect } from "vitest";
import { formatFileSize, formatDate } from "@/lib/utils/format";

describe("formatFileSize", () => {
  it("바이트 단위", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("킬로바이트 단위", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(512 * 1024)).toBe("512.0 KB");
  });

  it("메가바이트 단위", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(100 * 1024 * 1024)).toBe("100.0 MB");
  });

  it("기가바이트 단위", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe("1.50 GB");
  });
});

describe("formatDate", () => {
  it("타임스탬프를 날짜 형식으로 변환", () => {
    const timestamp = new Date("2024-01-15T14:30:00Z").getTime();
    const formatted = formatDate(timestamp);
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/01/);
    expect(formatted).toMatch(/15/);
  });

  it("현재 시간 포맷팅", () => {
    const formatted = formatDate(Date.now());
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toMatch(/\d{4}/);
  });
});

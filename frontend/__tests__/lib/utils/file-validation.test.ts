/**
 * file-validation 유틸리티 테스트
 */

import { describe, it, expect } from "vitest";
import {
  validateFileType,
  validateFileSize,
  validateFileCount,
  validateTotalSize,
  validateFile,
  calculateStorageUsage,
} from "@/lib/utils/file-validation";
import { FILE_CONSTRAINTS } from "@/lib/constants";

function createMockFile(name: string, size: number, type: string): File {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateFileType", () => {
  it("허용된 타입 통과", () => {
    expect(validateFileType(createMockFile("doc.pdf", 1000, "application/pdf"))).toEqual({ isValid: true });
    expect(validateFileType(createMockFile("img.png", 1000, "image/png"))).toEqual({ isValid: true });
  });

  it("확장자 기반 검증 (MIME 타입 없음)", () => {
    expect(validateFileType(createMockFile("doc.pdf", 1000, ""))).toEqual({ isValid: true });
  });

  it("허용되지 않은 타입 거부", () => {
    expect(validateFileType(createMockFile("app.exe", 1000, "application/x-msdownload")).isValid).toBe(false);
    expect(validateFileType(createMockFile("script.js", 1000, "text/javascript")).isValid).toBe(false);
  });
});

describe("validateFileSize", () => {
  it("최대 크기 이하 허용", () => {
    expect(validateFileSize(createMockFile("small.pdf", 1024, "application/pdf"))).toEqual({ isValid: true });
    expect(validateFileSize(createMockFile("max.pdf", FILE_CONSTRAINTS.MAX_FILE_SIZE, "application/pdf"))).toEqual({ isValid: true });
  });

  it("최대 크기 초과 거부", () => {
    const result = validateFileSize(createMockFile("large.pdf", FILE_CONSTRAINTS.MAX_FILE_SIZE + 1, "application/pdf"));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("파일 크기가 너무 큽니다");
  });
});

describe("validateFileCount", () => {
  it("제한 내 허용, 초과 거부", () => {
    expect(validateFileCount(5, 3)).toEqual({ isValid: true });
    expect(validateFileCount(5, 5)).toEqual({ isValid: true });
    expect(validateFileCount(5, 6).isValid).toBe(false);
  });
});

describe("validateTotalSize", () => {
  it("총 용량 제한 내 허용", () => {
    const existingFiles = [createMockFile("a.pdf", 100 * 1024 * 1024, "application/pdf")];
    const newFiles = [createMockFile("b.pdf", 100 * 1024 * 1024, "application/pdf")];
    expect(validateTotalSize(existingFiles, newFiles)).toEqual({ isValid: true });
  });

  it("총 용량 초과 거부", () => {
    const existingFiles = [createMockFile("a.pdf", 900 * 1024 * 1024, "application/pdf")];
    const newFiles = [createMockFile("b.pdf", 200 * 1024 * 1024, "application/pdf")];
    expect(validateTotalSize(existingFiles, newFiles).isValid).toBe(false);
  });
});

describe("validateFile", () => {
  it("유효한 파일 통과", () => {
    expect(validateFile(createMockFile("doc.pdf", 1024, "application/pdf"))).toEqual({ isValid: true });
  });

  it("타입/크기 오류 거부", () => {
    expect(validateFile(createMockFile("script.exe", 1024, "application/x-msdownload")).isValid).toBe(false);
    expect(validateFile(createMockFile("large.pdf", FILE_CONSTRAINTS.MAX_FILE_SIZE + 1, "application/pdf")).isValid).toBe(false);
  });
});

describe("calculateStorageUsage", () => {
  it("빈 파일 목록", () => {
    const usage = calculateStorageUsage([]);
    expect(usage.totalBytes).toBe(0);
    expect(usage.usagePercentage).toBe(0);
  });

  it("여러 파일 합산", () => {
    const files = [
      createMockFile("a.pdf", 100 * 1024 * 1024, "application/pdf"),
      createMockFile("b.pdf", 50 * 1024 * 1024, "application/pdf"),
    ];
    const usage = calculateStorageUsage(files);
    expect(usage.totalBytes).toBe(150 * 1024 * 1024);
    expect(usage.totalMB).toBe(150);
  });
});

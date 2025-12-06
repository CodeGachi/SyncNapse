/**
 * file-validation 유틸리티 테스트
 * 파일 타입, 크기, 개수, 전체 용량 검증
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateFileType,
  validateFileSize,
  validateFileCount,
  validateTotalSize,
  validateFile,
  calculateStorageUsage,
} from "@/lib/utils/file-validation";
import { FILE_CONSTRAINTS } from "@/lib/constants";

// Mock File 생성 헬퍼
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateFileType", () => {
  describe("허용된 타입", () => {
    it("PDF 파일 허용", () => {
      const file = createMockFile("doc.pdf", 1000, "application/pdf");
      expect(validateFileType(file)).toEqual({ isValid: true });
    });

    it("JPEG 이미지 허용", () => {
      const file = createMockFile("img.jpg", 1000, "image/jpeg");
      expect(validateFileType(file)).toEqual({ isValid: true });
    });

    it("PNG 이미지 허용", () => {
      const file = createMockFile("img.png", 1000, "image/png");
      expect(validateFileType(file)).toEqual({ isValid: true });
    });

    it("Word 문서 허용", () => {
      const file = createMockFile(
        "doc.docx",
        1000,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(validateFileType(file)).toEqual({ isValid: true });
    });
  });

  describe("확장자 기반 검증", () => {
    it("MIME 타입이 없어도 확장자가 허용되면 통과", () => {
      const file = createMockFile("doc.pdf", 1000, "");
      expect(validateFileType(file)).toEqual({ isValid: true });
    });
  });

  describe("허용되지 않은 타입", () => {
    it("실행 파일 거부", () => {
      const file = createMockFile("app.exe", 1000, "application/x-msdownload");
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("지원하지 않는 파일 형식");
    });

    it("JavaScript 파일 거부", () => {
      const file = createMockFile("script.js", 1000, "text/javascript");
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
    });

    it("HTML 파일 거부", () => {
      const file = createMockFile("page.html", 1000, "text/html");
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
    });
  });
});

describe("validateFileSize", () => {
  it("작은 파일 허용", () => {
    const file = createMockFile("small.pdf", 1024, "application/pdf");
    expect(validateFileSize(file)).toEqual({ isValid: true });
  });

  it("최대 크기 이하 파일 허용", () => {
    const file = createMockFile(
      "max.pdf",
      FILE_CONSTRAINTS.MAX_FILE_SIZE,
      "application/pdf"
    );
    expect(validateFileSize(file)).toEqual({ isValid: true });
  });

  it("최대 크기 초과 파일 거부", () => {
    const file = createMockFile(
      "large.pdf",
      FILE_CONSTRAINTS.MAX_FILE_SIZE + 1,
      "application/pdf"
    );
    const result = validateFileSize(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("파일 크기가 너무 큽니다");
  });

  it("에러 메시지에 파일 크기 정보 포함", () => {
    const file = createMockFile(
      "large.pdf",
      150 * 1024 * 1024, // 150MB
      "application/pdf"
    );
    const result = validateFileSize(file);
    expect(result.error).toContain("150.0MB");
  });
});

describe("validateFileCount", () => {
  it("파일 개수 제한 내 허용", () => {
    expect(validateFileCount(5, 3)).toEqual({ isValid: true });
  });

  it("최대 개수까지 허용", () => {
    expect(validateFileCount(5, 5)).toEqual({ isValid: true });
  });

  it("최대 개수 초과 거부", () => {
    const result = validateFileCount(5, 6);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(`최대 ${FILE_CONSTRAINTS.MAX_FILES}개`);
  });

  it("0개에서 시작", () => {
    expect(validateFileCount(0, 5)).toEqual({ isValid: true });
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

    const result = validateTotalSize(existingFiles, newFiles);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("저장 공간 한도를 초과");
  });

  it("빈 기존 파일 목록", () => {
    const newFiles = [createMockFile("a.pdf", 100 * 1024 * 1024, "application/pdf")];
    expect(validateTotalSize([], newFiles)).toEqual({ isValid: true });
  });
});

describe("validateFile", () => {
  it("유효한 파일 통과", () => {
    const file = createMockFile("doc.pdf", 1024, "application/pdf");
    expect(validateFile(file)).toEqual({ isValid: true });
  });

  it("타입이 잘못된 파일 거부", () => {
    const file = createMockFile("script.exe", 1024, "application/x-msdownload");
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("지원하지 않는 파일 형식");
  });

  it("크기가 초과된 파일 거부", () => {
    const file = createMockFile(
      "large.pdf",
      FILE_CONSTRAINTS.MAX_FILE_SIZE + 1,
      "application/pdf"
    );
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("파일 크기가 너무 큽니다");
  });
});

describe("calculateStorageUsage", () => {
  it("빈 파일 목록", () => {
    const usage = calculateStorageUsage([]);
    expect(usage.totalBytes).toBe(0);
    expect(usage.totalMB).toBe(0);
    expect(usage.totalGB).toBe(0);
    expect(usage.usagePercentage).toBe(0);
  });

  it("단일 파일", () => {
    const files = [createMockFile("a.pdf", 10 * 1024 * 1024, "application/pdf")];
    const usage = calculateStorageUsage(files);

    expect(usage.totalBytes).toBe(10 * 1024 * 1024);
    expect(usage.totalMB).toBe(10);
    expect(usage.totalGB).toBeCloseTo(10 / 1024, 5);
  });

  it("여러 파일 합산", () => {
    const files = [
      createMockFile("a.pdf", 100 * 1024 * 1024, "application/pdf"),
      createMockFile("b.pdf", 50 * 1024 * 1024, "application/pdf"),
      createMockFile("c.pdf", 25 * 1024 * 1024, "application/pdf"),
    ];
    const usage = calculateStorageUsage(files);

    expect(usage.totalBytes).toBe(175 * 1024 * 1024);
    expect(usage.totalMB).toBe(175);
  });

  it("사용률 계산", () => {
    const files = [
      createMockFile(
        "a.pdf",
        FILE_CONSTRAINTS.MAX_TOTAL_SIZE / 2,
        "application/pdf"
      ),
    ];
    const usage = calculateStorageUsage(files);

    expect(usage.usagePercentage).toBe(50);
  });
});

/**
 * file-name 유틸리티 테스트
 */

import { describe, it, expect } from "vitest";
import {
  validateFileName,
  detectDuplicateFile,
  detectFileNameConflict,
  generateSafeFileName,
} from "@/lib/utils/file-name";

function createMockFile(
  name: string,
  size: number = 1000,
  lastModified: number = Date.now()
): File {
  const file = new File([""], name);
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(file, "lastModified", { value: lastModified });
  return file;
}

describe("validateFileName", () => {
  it("유효한 파일명 통과", () => {
    expect(validateFileName("document.pdf")).toEqual({ isValid: true });
    expect(validateFileName("문서.pdf")).toEqual({ isValid: true });
    expect(validateFileName("my-document_v2.pdf")).toEqual({ isValid: true });
  });

  it("빈 파일명 거부", () => {
    expect(validateFileName("").isValid).toBe(false);
    expect(validateFileName("   ").isValid).toBe(false);
  });

  it("255자 초과 파일명 거부", () => {
    const result = validateFileName("a".repeat(256));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("파일명이 너무 깁니다");
  });

  it("위험한 특수문자 거부", () => {
    expect(validateFileName("file<name.pdf").isValid).toBe(false);
    expect(validateFileName("file|name.pdf").isValid).toBe(false);
    expect(validateFileName("file*name.pdf").isValid).toBe(false);
  });

  it("Windows 예약 파일명 거부", () => {
    expect(validateFileName("CON.txt").isValid).toBe(false);
    expect(validateFileName("con.txt").isValid).toBe(false);
    expect(validateFileName("COM0.txt")).toEqual({ isValid: true });
  });
});

describe("detectDuplicateFile", () => {
  it("완전히 동일한 파일 감지", () => {
    const timestamp = 1704067200000;
    const newFile = createMockFile("doc.pdf", 1000, timestamp);
    const existingFiles = [createMockFile("doc.pdf", 1000, timestamp)];
    expect(detectDuplicateFile(newFile, existingFiles).isDuplicate).toBe(true);
  });

  it("이름/크기/수정일이 다르면 중복 아님", () => {
    const newFile = createMockFile("doc.pdf", 1000, Date.now());
    const existingFiles = [createMockFile("doc.pdf", 2000, Date.now() - 1000)];
    expect(detectDuplicateFile(newFile, existingFiles).isDuplicate).toBe(false);
  });

  it("빈 목록에서 중복 없음", () => {
    expect(detectDuplicateFile(createMockFile("doc.pdf"), []).isDuplicate).toBe(false);
  });
});

describe("detectFileNameConflict", () => {
  it("같은 이름 충돌 감지", () => {
    const existingFiles = [createMockFile("doc.pdf")];
    expect(detectFileNameConflict("doc.pdf", existingFiles).hasConflict).toBe(true);
  });

  it("다른 이름/빈 목록 충돌 없음", () => {
    expect(detectFileNameConflict("other.pdf", [createMockFile("doc.pdf")]).hasConflict).toBe(false);
    expect(detectFileNameConflict("doc.pdf", []).hasConflict).toBe(false);
  });
});

describe("generateSafeFileName", () => {
  it("충돌 없으면 원본 반환", () => {
    expect(generateSafeFileName("doc.pdf", [])).toBe("doc.pdf");
  });

  it("충돌 시 숫자 추가", () => {
    const existingFiles = [createMockFile("doc.pdf")];
    expect(generateSafeFileName("doc.pdf", existingFiles)).toBe("doc (1).pdf");
  });

  it("연속 충돌 시 숫자 증가", () => {
    const existingFiles = [
      createMockFile("doc.pdf"),
      createMockFile("doc (1).pdf"),
      createMockFile("doc (2).pdf"),
    ];
    expect(generateSafeFileName("doc.pdf", existingFiles)).toBe("doc (3).pdf");
  });

  it("확장자 없는 파일", () => {
    expect(generateSafeFileName("README", [createMockFile("README")])).toBe("README (1)");
  });
});

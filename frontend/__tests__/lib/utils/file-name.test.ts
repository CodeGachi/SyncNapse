/**
 * file-name 유틸리티 테스트
 * 파일명 검증 및 처리
 */

import { describe, it, expect } from "vitest";
import {
  validateFileName,
  detectDuplicateFile,
  detectFileNameConflict,
  generateSafeFileName,
} from "@/lib/utils/file-name";

// Mock File 생성 헬퍼
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
  describe("유효한 파일명", () => {
    it("일반 파일명 통과", () => {
      expect(validateFileName("document.pdf")).toEqual({ isValid: true });
    });

    it("한글 파일명 통과", () => {
      expect(validateFileName("문서.pdf")).toEqual({ isValid: true });
    });

    it("공백 포함 파일명 통과", () => {
      expect(validateFileName("my document.pdf")).toEqual({ isValid: true });
    });

    it("숫자 포함 파일명 통과", () => {
      expect(validateFileName("document123.pdf")).toEqual({ isValid: true });
    });

    it("대시와 언더스코어 통과", () => {
      expect(validateFileName("my-document_v2.pdf")).toEqual({ isValid: true });
    });
  });

  describe("파일명 길이", () => {
    it("255자 이하 통과", () => {
      const name = "a".repeat(250) + ".pdf";
      expect(validateFileName(name)).toEqual({ isValid: true });
    });

    it("255자 초과 거부", () => {
      const name = "a".repeat(256);
      const result = validateFileName(name);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("파일명이 너무 깁니다");
    });
  });

  describe("빈 파일명", () => {
    it("빈 문자열 거부", () => {
      const result = validateFileName("");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("파일명이 비어있습니다");
    });

    it("공백만 있는 파일명 거부", () => {
      const result = validateFileName("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("파일명이 비어있습니다");
    });
  });

  describe("위험한 특수문자", () => {
    it("< 문자 거부", () => {
      const result = validateFileName("file<name.pdf");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("사용할 수 없는 문자");
    });

    it("> 문자 거부", () => {
      const result = validateFileName("file>name.pdf");
      expect(result.isValid).toBe(false);
    });

    it(": 문자 거부", () => {
      const result = validateFileName("file:name.pdf");
      expect(result.isValid).toBe(false);
    });

    it('" 문자 거부', () => {
      const result = validateFileName('file"name.pdf');
      expect(result.isValid).toBe(false);
    });

    it("| 문자 거부", () => {
      const result = validateFileName("file|name.pdf");
      expect(result.isValid).toBe(false);
    });

    it("? 문자 거부", () => {
      const result = validateFileName("file?name.pdf");
      expect(result.isValid).toBe(false);
    });

    it("* 문자 거부", () => {
      const result = validateFileName("file*name.pdf");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Windows 예약 파일명", () => {
    it("CON 거부", () => {
      const result = validateFileName("CON.txt");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("예약된 파일명");
    });

    it("PRN 거부", () => {
      const result = validateFileName("PRN.txt");
      expect(result.isValid).toBe(false);
    });

    it("AUX 거부", () => {
      const result = validateFileName("AUX.txt");
      expect(result.isValid).toBe(false);
    });

    it("NUL 거부", () => {
      const result = validateFileName("NUL.txt");
      expect(result.isValid).toBe(false);
    });

    it("COM1 거부", () => {
      const result = validateFileName("COM1.txt");
      expect(result.isValid).toBe(false);
    });

    it("LPT1 거부", () => {
      const result = validateFileName("LPT1.txt");
      expect(result.isValid).toBe(false);
    });

    it("대소문자 구분 없이 거부", () => {
      const result = validateFileName("con.txt");
      expect(result.isValid).toBe(false);
    });

    it("COM0은 허용 (예약어 아님)", () => {
      expect(validateFileName("COM0.txt")).toEqual({ isValid: true });
    });
  });
});

describe("detectDuplicateFile", () => {
  it("완전히 동일한 파일 감지", () => {
    const timestamp = 1704067200000;
    const newFile = createMockFile("doc.pdf", 1000, timestamp);
    const existingFiles = [createMockFile("doc.pdf", 1000, timestamp)];

    const result = detectDuplicateFile(newFile, existingFiles);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateFile).toBeDefined();
  });

  it("이름만 같으면 중복 아님", () => {
    const newFile = createMockFile("doc.pdf", 1000, Date.now());
    const existingFiles = [createMockFile("doc.pdf", 2000, Date.now() - 1000)];

    const result = detectDuplicateFile(newFile, existingFiles);
    expect(result.isDuplicate).toBe(false);
  });

  it("크기가 다르면 중복 아님", () => {
    const timestamp = 1704067200000;
    const newFile = createMockFile("doc.pdf", 1000, timestamp);
    const existingFiles = [createMockFile("doc.pdf", 2000, timestamp)];

    const result = detectDuplicateFile(newFile, existingFiles);
    expect(result.isDuplicate).toBe(false);
  });

  it("수정일이 다르면 중복 아님", () => {
    const newFile = createMockFile("doc.pdf", 1000, 1704067200000);
    const existingFiles = [createMockFile("doc.pdf", 1000, 1704067200001)];

    const result = detectDuplicateFile(newFile, existingFiles);
    expect(result.isDuplicate).toBe(false);
  });

  it("빈 목록에서 중복 없음", () => {
    const newFile = createMockFile("doc.pdf");
    const result = detectDuplicateFile(newFile, []);
    expect(result.isDuplicate).toBe(false);
  });
});

describe("detectFileNameConflict", () => {
  it("같은 이름 충돌 감지", () => {
    const existingFiles = [createMockFile("doc.pdf")];
    const result = detectFileNameConflict("doc.pdf", existingFiles);

    expect(result.hasConflict).toBe(true);
    expect(result.conflictFile?.name).toBe("doc.pdf");
  });

  it("다른 이름 충돌 없음", () => {
    const existingFiles = [createMockFile("doc.pdf")];
    const result = detectFileNameConflict("other.pdf", existingFiles);

    expect(result.hasConflict).toBe(false);
  });

  it("대소문자 구분", () => {
    const existingFiles = [createMockFile("Doc.pdf")];
    const result = detectFileNameConflict("doc.pdf", existingFiles);

    expect(result.hasConflict).toBe(false);
  });

  it("빈 목록에서 충돌 없음", () => {
    const result = detectFileNameConflict("doc.pdf", []);
    expect(result.hasConflict).toBe(false);
  });
});

describe("generateSafeFileName", () => {
  it("충돌 없으면 원본 반환", () => {
    const existingFiles: File[] = [];
    const result = generateSafeFileName("doc.pdf", existingFiles);

    expect(result).toBe("doc.pdf");
  });

  it("충돌 시 (1) 추가", () => {
    const existingFiles = [createMockFile("doc.pdf")];
    const result = generateSafeFileName("doc.pdf", existingFiles);

    expect(result).toBe("doc (1).pdf");
  });

  it("연속 충돌 시 숫자 증가", () => {
    const existingFiles = [
      createMockFile("doc.pdf"),
      createMockFile("doc (1).pdf"),
      createMockFile("doc (2).pdf"),
    ];
    const result = generateSafeFileName("doc.pdf", existingFiles);

    expect(result).toBe("doc (3).pdf");
  });

  it("확장자 없는 파일", () => {
    const existingFiles = [createMockFile("README")];
    const result = generateSafeFileName("README", existingFiles);

    expect(result).toBe("README (1)");
  });

  it("여러 점이 있는 파일명", () => {
    const existingFiles = [createMockFile("my.file.name.pdf")];
    const result = generateSafeFileName("my.file.name.pdf", existingFiles);

    expect(result).toBe("my.file.name (1).pdf");
  });

  it("마지막 점 앞에 숫자 추가", () => {
    const existingFiles = [createMockFile("file.tar.gz")];
    const result = generateSafeFileName("file.tar.gz", existingFiles);

    expect(result).toBe("file.tar (1).gz");
  });
});

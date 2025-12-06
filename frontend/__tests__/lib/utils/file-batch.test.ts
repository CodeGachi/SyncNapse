/**
 * file-batch 유틸리티 테스트
 * 여러 파일 일괄 검증
 */

import { describe, it, expect, vi } from "vitest";
import { validateFiles } from "@/lib/utils/file-batch";
import { FILE_CONSTRAINTS } from "@/lib/constants";

// Mock File 생성 헬퍼
function createMockFile(
  name: string,
  size: number = 1000,
  type: string = "application/pdf",
  lastModified: number = Date.now()
): File {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(file, "lastModified", { value: lastModified });
  return file;
}

describe("validateFiles", () => {
  describe("유효한 파일", () => {
    it("단일 유효한 파일 통과", () => {
      const files = [createMockFile("doc.pdf")];
      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(1);
      expect(result.invalidFiles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it("여러 유효한 파일 통과", () => {
      const files = [
        createMockFile("doc1.pdf"),
        createMockFile("doc2.pdf"),
        createMockFile("image.png", 1000, "image/png"),
      ];
      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(3);
      expect(result.invalidFiles).toHaveLength(0);
    });

    it("빈 배열 처리", () => {
      const result = validateFiles([]);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe("파일 개수 제한", () => {
    it("최대 개수 초과시 모든 파일 거부", () => {
      const existingFiles = Array.from({ length: 8 }, (_, i) =>
        createMockFile(`existing${i}.pdf`)
      );
      const newFiles = [
        createMockFile("new1.pdf"),
        createMockFile("new2.pdf"),
        createMockFile("new3.pdf"),
      ];

      const result = validateFiles(newFiles, existingFiles);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(3);
      expect(result.invalidFiles[0].error).toContain(
        `최대 ${FILE_CONSTRAINTS.MAX_FILES}개`
      );
    });

    it("최대 개수 이하면 통과", () => {
      const existingFiles = [createMockFile("existing.pdf")];
      const newFiles = [createMockFile("new.pdf")];

      const result = validateFiles(newFiles, existingFiles);

      expect(result.validFiles).toHaveLength(1);
    });
  });

  describe("총 용량 제한", () => {
    it("총 용량 초과시 모든 파일 거부", () => {
      const existingFiles = [
        createMockFile("big1.pdf", 600 * 1024 * 1024), // 600MB
      ];
      const newFiles = [
        createMockFile("big2.pdf", 600 * 1024 * 1024), // 600MB (총 1.2GB > 1GB)
      ];

      const result = validateFiles(newFiles, existingFiles);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].error).toContain("저장 공간 한도");
    });
  });

  describe("파일명 검증", () => {
    it("위험한 파일명 거부", () => {
      const files = [createMockFile("file<name>.pdf")];
      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].error).toContain("사용할 수 없는 문자");
    });

    it("빈 파일명 거부", () => {
      const files = [createMockFile("   ")];
      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(1);
    });
  });

  describe("파일 타입/크기 검증", () => {
    it("지원하지 않는 타입 거부", () => {
      const files = [createMockFile("script.exe", 1000, "application/x-msdownload")];
      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].error).toContain("지원하지 않는 파일 형식");
    });

    it("너무 큰 파일 거부", () => {
      const files = [
        createMockFile("huge.pdf", FILE_CONSTRAINTS.MAX_FILE_SIZE + 1),
      ];
      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].error).toContain("파일 크기가 너무 큽니다");
    });
  });

  describe("중복 파일 감지", () => {
    it("기존 파일과 중복 감지", () => {
      const timestamp = 1704067200000;
      const existingFiles = [createMockFile("doc.pdf", 1000, "application/pdf", timestamp)];
      const newFiles = [createMockFile("doc.pdf", 1000, "application/pdf", timestamp)];

      const result = validateFiles(newFiles, existingFiles);

      expect(result.validFiles).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].name).toBe("doc.pdf");
    });

    it("새 파일 간 중복 감지", () => {
      const timestamp = Date.now();
      const files = [
        createMockFile("doc.pdf", 1000, "application/pdf", timestamp),
        createMockFile("doc.pdf", 1000, "application/pdf", timestamp),
      ];

      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(1);
    });

    it("이름만 같으면 중복 아님", () => {
      const existingFiles = [createMockFile("doc.pdf", 1000, "application/pdf", 1000)];
      const newFiles = [createMockFile("doc.pdf", 2000, "application/pdf", 2000)];

      const result = validateFiles(newFiles, existingFiles);

      expect(result.validFiles).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe("혼합 시나리오", () => {
    it("유효, 무효, 중복 파일 혼합", () => {
      const timestamp = 1704067200000;
      const existingFiles = [
        createMockFile("existing.pdf", 1000, "application/pdf", timestamp),
      ];
      const newFiles = [
        createMockFile("valid.pdf"), // 유효
        createMockFile("script.exe", 1000, "application/x-msdownload"), // 무효 (타입)
        createMockFile("existing.pdf", 1000, "application/pdf", timestamp), // 중복
      ];

      const result = validateFiles(newFiles, existingFiles);

      expect(result.validFiles).toHaveLength(1);
      expect(result.validFiles[0].name).toBe("valid.pdf");
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].file.name).toBe("script.exe");
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].name).toBe("existing.pdf");
    });
  });
});

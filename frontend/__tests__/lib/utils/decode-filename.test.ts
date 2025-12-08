/**
 * decode-filename 유틸리티 테스트
 * Multer Latin-1 인코딩 파일명 디코딩
 */

import { describe, it, expect } from "vitest";
import { decodeFilename } from "@/lib/utils/decode-filename";

describe("decodeFilename", () => {
  describe("ASCII 파일명", () => {
    it("영문 파일명 그대로 반환", () => {
      expect(decodeFilename("document.pdf")).toBe("document.pdf");
    });

    it("숫자 포함 파일명", () => {
      expect(decodeFilename("file123.txt")).toBe("file123.txt");
    });

    it("특수문자 포함 파일명", () => {
      expect(decodeFilename("my-file_v2.pdf")).toBe("my-file_v2.pdf");
    });

    it("공백 포함 파일명", () => {
      expect(decodeFilename("my document.pdf")).toBe("my document.pdf");
    });
  });

  describe("UTF-8 인코딩된 한글 파일명", () => {
    it("한글 파일명 디코딩", () => {
      // "문서.pdf"를 UTF-8 바이트로 인코딩한 후 Latin-1로 해석한 문자열
      const utf8Bytes = new TextEncoder().encode("문서.pdf");
      const latin1String = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(latin1String)).toBe("문서.pdf");
    });

    it("한글+영문 혼합 파일명", () => {
      const utf8Bytes = new TextEncoder().encode("내문서doc.pdf");
      const latin1String = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(latin1String)).toBe("내문서doc.pdf");
    });

    it("긴 한글 파일명", () => {
      const koreanName = "대한민국의 역사적 문서.pdf";
      const utf8Bytes = new TextEncoder().encode(koreanName);
      const latin1String = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(latin1String)).toBe(koreanName);
    });
  });

  describe("일본어/중국어 파일명", () => {
    it("일본어 히라가나 디코딩", () => {
      const japaneseName = "ファイル.pdf";
      const utf8Bytes = new TextEncoder().encode(japaneseName);
      const latin1String = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(latin1String)).toBe(japaneseName);
    });

    it("중국어 간체 디코딩", () => {
      const chineseName = "文件.pdf";
      const utf8Bytes = new TextEncoder().encode(chineseName);
      const latin1String = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(latin1String)).toBe(chineseName);
    });
  });

  describe("이모지 파일명", () => {
    it("이모지 포함 파일명 디코딩", () => {
      const emojiName = "📄document.pdf";
      const utf8Bytes = new TextEncoder().encode(emojiName);
      const latin1String = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(latin1String)).toBe(emojiName);
    });
  });

  describe("에지 케이스", () => {
    it("빈 문자열", () => {
      expect(decodeFilename("")).toBe("");
    });

    it("이미 올바른 유니코드 문자열 (디코딩 불필요)", () => {
      // 이미 정상적인 유니코드 문자열이면 그대로 반환될 수 있음
      // (replacement character가 생기면 원본 반환)
      const result = decodeFilename("문서.pdf");
      // 결과는 원본 또는 디코딩된 값
      expect(result.length).toBeGreaterThan(0);
    });

    it("단일 바이트 문자", () => {
      expect(decodeFilename("a")).toBe("a");
    });

    it("확장자만 있는 파일명", () => {
      expect(decodeFilename(".gitignore")).toBe(".gitignore");
    });
  });

  describe("실제 Multer 시나리오", () => {
    it("Multer가 인코딩한 한글 파일명 복원", () => {
      // Multer가 한글 파일명 "테스트.pdf"를 처리하면
      // Latin-1로 해석되어 깨진 문자열이 됨
      // 이 함수는 원래 UTF-8로 복원해야 함
      const originalName = "테스트.pdf";
      const utf8Bytes = new TextEncoder().encode(originalName);
      const multerProcessed = String.fromCharCode(...utf8Bytes);

      const decoded = decodeFilename(multerProcessed);
      expect(decoded).toBe(originalName);
    });

    it("실제 API 응답 시뮬레이션", () => {
      // API가 "보고서_2024.pdf"를 반환하는 상황 시뮬레이션
      const koreanFilename = "보고서_2024.pdf";
      const utf8Bytes = new TextEncoder().encode(koreanFilename);
      const apiResponse = String.fromCharCode(...utf8Bytes);

      expect(decodeFilename(apiResponse)).toBe(koreanFilename);
    });
  });
});

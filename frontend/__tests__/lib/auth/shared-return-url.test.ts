/**
 * shared-return-url 테스트
 * 공유 링크 returnUrl 관리 유틸리티
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveSharedReturnUrl,
  getAndClearSharedReturnUrl,
} from "@/lib/auth/shared-return-url";

describe("shared-return-url", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("saveSharedReturnUrl", () => {
    it("URL을 localStorage에 저장", () => {
      const url = "/shared/note/123";
      saveSharedReturnUrl(url);

      expect(localStorage.getItem("syncnapse_shared_return_url")).toBe(url);
    });

    it("긴 URL 저장", () => {
      const url = "/shared/note/abc123?param=value&other=test#section";
      saveSharedReturnUrl(url);

      expect(localStorage.getItem("syncnapse_shared_return_url")).toBe(url);
    });

    it("기존 URL 덮어쓰기", () => {
      saveSharedReturnUrl("/old-url");
      saveSharedReturnUrl("/new-url");

      expect(localStorage.getItem("syncnapse_shared_return_url")).toBe("/new-url");
    });
  });

  describe("getAndClearSharedReturnUrl", () => {
    it("저장된 URL 반환 후 삭제", () => {
      const url = "/shared/note/123";
      saveSharedReturnUrl(url);

      const result = getAndClearSharedReturnUrl();

      expect(result).toBe(url);
      expect(localStorage.getItem("syncnapse_shared_return_url")).toBeNull();
    });

    it("URL이 없으면 null 반환", () => {
      const result = getAndClearSharedReturnUrl();

      expect(result).toBeNull();
    });

    it("두 번 호출하면 두 번째는 null", () => {
      saveSharedReturnUrl("/shared/note/123");

      const first = getAndClearSharedReturnUrl();
      const second = getAndClearSharedReturnUrl();

      expect(first).toBe("/shared/note/123");
      expect(second).toBeNull();
    });
  });

  describe("SSR 환경 (window undefined)", () => {
    it("saveSharedReturnUrl은 SSR에서 아무것도 하지 않음", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // 에러 없이 실행되어야 함
      expect(() => saveSharedReturnUrl("/test")).not.toThrow();

      global.window = originalWindow;
    });

    it("getAndClearSharedReturnUrl은 SSR에서 null 반환", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = getAndClearSharedReturnUrl();
      expect(result).toBeNull();

      global.window = originalWindow;
    });
  });
});

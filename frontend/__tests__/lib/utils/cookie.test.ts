/**
 * cookie 유틸리티 테스트
 * 브라우저 쿠키 읽기/쓰기/삭제
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCookie, setCookie, deleteCookie } from "@/lib/utils/cookie";

describe("cookie", () => {
  let originalDocument: typeof document;

  beforeEach(() => {
    // Mock document.cookie
    originalDocument = global.document;

    let cookieStore = "";
    Object.defineProperty(global, "document", {
      value: {
        get cookie() {
          return cookieStore;
        },
        set cookie(value: string) {
          // Parse and store cookies
          const [cookiePart] = value.split(";");
          const [name, val] = cookiePart.split("=");

          // Handle deletion (expires in past)
          if (value.includes("expires=Thu, 01 Jan 1970")) {
            const newCookies = cookieStore
              .split("; ")
              .filter((c) => !c.startsWith(`${name}=`))
              .join("; ");
            cookieStore = newCookies;
          } else {
            // Handle setting
            const existingCookies = cookieStore
              .split("; ")
              .filter((c) => c && !c.startsWith(`${name}=`));
            existingCookies.push(`${name}=${val}`);
            cookieStore = existingCookies.filter(Boolean).join("; ");
          }
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "document", {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  describe("getCookie", () => {
    it("존재하는 쿠키 값 반환", () => {
      document.cookie = "testCookie=testValue";
      expect(getCookie("testCookie")).toBe("testValue");
    });

    it("존재하지 않는 쿠키는 null 반환", () => {
      expect(getCookie("nonExistent")).toBeNull();
    });

    it("여러 쿠키 중 특정 쿠키 반환", () => {
      document.cookie = "first=one";
      document.cookie = "second=two";
      document.cookie = "third=three";

      expect(getCookie("second")).toBe("two");
    });

    it("빈 쿠키 저장소에서 null 반환", () => {
      expect(getCookie("anything")).toBeNull();
    });
  });

  describe("setCookie", () => {
    it("쿠키 설정", () => {
      setCookie("myCookie", "myValue");
      expect(getCookie("myCookie")).toBe("myValue");
    });

    it("기존 쿠키 덮어쓰기", () => {
      setCookie("myCookie", "oldValue");
      setCookie("myCookie", "newValue");
      expect(getCookie("myCookie")).toBe("newValue");
    });

    it("여러 쿠키 설정", () => {
      setCookie("cookie1", "value1");
      setCookie("cookie2", "value2");

      expect(getCookie("cookie1")).toBe("value1");
      expect(getCookie("cookie2")).toBe("value2");
    });
  });

  describe("deleteCookie", () => {
    it("쿠키 삭제", () => {
      setCookie("toDelete", "value");
      expect(getCookie("toDelete")).toBe("value");

      deleteCookie("toDelete");
      expect(getCookie("toDelete")).toBeNull();
    });

    it("존재하지 않는 쿠키 삭제 시 에러 없음", () => {
      expect(() => deleteCookie("nonExistent")).not.toThrow();
    });

    it("다른 쿠키에 영향 없음", () => {
      setCookie("keep", "keepValue");
      setCookie("delete", "deleteValue");

      deleteCookie("delete");

      expect(getCookie("keep")).toBe("keepValue");
      expect(getCookie("delete")).toBeNull();
    });
  });

  describe("SSR 환경 (document undefined)", () => {
    it("getCookie - SSR에서 null 반환", () => {
      const doc = global.document;
      // @ts-ignore
      delete global.document;

      expect(getCookie("test")).toBeNull();

      global.document = doc;
    });

    it("setCookie - SSR에서 에러 없음", () => {
      const doc = global.document;
      // @ts-ignore
      delete global.document;

      expect(() => setCookie("test", "value")).not.toThrow();

      global.document = doc;
    });

    it("deleteCookie - SSR에서 에러 없음", () => {
      const doc = global.document;
      // @ts-ignore
      delete global.document;

      expect(() => deleteCookie("test")).not.toThrow();

      global.document = doc;
    });
  });
});

/**
 * cookie 유틸리티 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCookie, setCookie, deleteCookie } from "@/lib/utils/cookie";

describe("cookie", () => {
  let originalDocument: typeof document;

  beforeEach(() => {
    originalDocument = global.document;
    let cookieStore = "";
    Object.defineProperty(global, "document", {
      value: {
        get cookie() { return cookieStore; },
        set cookie(value: string) {
          const [cookiePart] = value.split(";");
          const [name, val] = cookiePart.split("=");
          if (value.includes("expires=Thu, 01 Jan 1970")) {
            cookieStore = cookieStore.split("; ").filter((c) => !c.startsWith(`${name}=`)).join("; ");
          } else {
            const existing = cookieStore.split("; ").filter((c) => c && !c.startsWith(`${name}=`));
            existing.push(`${name}=${val}`);
            cookieStore = existing.filter(Boolean).join("; ");
          }
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "document", { value: originalDocument, writable: true, configurable: true });
  });

  it("getCookie/setCookie/deleteCookie 기본 동작", () => {
    expect(getCookie("nonExistent")).toBeNull();

    setCookie("myCookie", "myValue");
    expect(getCookie("myCookie")).toBe("myValue");

    setCookie("myCookie", "newValue");
    expect(getCookie("myCookie")).toBe("newValue");

    setCookie("other", "otherValue");
    expect(getCookie("other")).toBe("otherValue");

    deleteCookie("myCookie");
    expect(getCookie("myCookie")).toBeNull();
    expect(getCookie("other")).toBe("otherValue");
  });

  it("SSR 환경에서 에러 없이 동작", () => {
    const doc = global.document;
    // @ts-ignore
    delete global.document;

    expect(getCookie("test")).toBeNull();
    expect(() => setCookie("test", "value")).not.toThrow();
    expect(() => deleteCookie("test")).not.toThrow();

    global.document = doc;
  });
});

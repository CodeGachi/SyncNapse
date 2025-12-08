/**
 * token-manager 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setAccessToken, getAccessToken, clearTokens, isTokenExpired } from "@/lib/auth/token-manager";

vi.mock("@/lib/utils/cookie", () => {
  const store: Record<string, string> = {};
  return {
    getCookie: vi.fn((name: string) => store[name] || null),
    setCookie: vi.fn((name: string, value: string) => { store[name] = value; }),
    deleteCookie: vi.fn((name: string) => { delete store[name]; }),
  };
});
vi.mock("@/lib/api/hal/api-discovery", () => ({ getCachedHref: vi.fn(() => "http://api.test.com/auth/refresh") }));

beforeEach(() => { vi.clearAllMocks(); });

describe("token-manager", () => {
  it("토큰 저장 및 조회", () => {
    setAccessToken("test-token");
    expect(getAccessToken()).toBe("test-token");
  });

  it("토큰 삭제", () => {
    setAccessToken("test-token");
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it("만료된 토큰 확인", () => {
    // exp가 과거인 토큰
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 }));
    const expiredToken = `header.${expiredPayload}.signature`;
    expect(isTokenExpired(expiredToken)).toBe(true);
  });
});

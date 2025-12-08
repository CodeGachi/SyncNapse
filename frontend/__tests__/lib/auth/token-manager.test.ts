import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/utils/cookie", () => {
  let store: Record<string, string> = {};
  return {
    getCookie: vi.fn((name: string) => store[name] || null),
    setCookie: vi.fn((name: string, value: string) => { store[name] = value; }),
    deleteCookie: vi.fn((name: string) => { delete store[name]; }),
  };
});
vi.mock("@/lib/api/hal/api-discovery", () => ({ getCachedHref: vi.fn() }));

import { isTokenExpired } from "@/lib/auth/token-manager";

describe("token-manager", () => {
  it("만료된 토큰 확인", () => {
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 }));
    const expiredToken = `header.${expiredPayload}.signature`;
    expect(isTokenExpired(expiredToken)).toBe(true);
  });
});

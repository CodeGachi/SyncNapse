import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStore: Record<string, string> = {};

vi.mock("@/lib/utils/cookie", () => ({
  getCookie: vi.fn((name: string) => mockStore[name] || null),
  setCookie: vi.fn((name: string, value: string) => { mockStore[name] = value; }),
  deleteCookie: vi.fn((name: string) => { delete mockStore[name]; }),
}));
vi.mock("@/lib/api/hal/api-discovery", () => ({ getCachedHref: vi.fn() }));

import { isTokenExpired } from "@/lib/auth/token-manager";

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStore).forEach(key => delete mockStore[key]);
});

describe("token-manager", () => {
  it("만료된 토큰 확인", () => {
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 }));
    const expiredToken = `header.${expiredPayload}.signature`;
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it("유효한 토큰 확인", () => {
    const validPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const validToken = `header.${validPayload}.signature`;
    expect(isTokenExpired(validToken)).toBe(false);
  });
});

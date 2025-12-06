/**
 * token-manager 테스트
 * JWT 토큰 관리 (쿠키 기반)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  decodeToken,
  isTokenExpired,
  isTokenExpiringSoon,
  refreshAccessToken,
  getValidAccessToken,
  getAuthHeaders,
} from "@/lib/auth/token-manager";

// Mock cookie utilities
vi.mock("@/lib/utils/cookie", () => {
  const cookieStore: Record<string, string> = {};
  return {
    getCookie: vi.fn((name: string) => cookieStore[name] || null),
    setCookie: vi.fn((name: string, value: string) => {
      cookieStore[name] = value;
    }),
    deleteCookie: vi.fn((name: string) => {
      delete cookieStore[name];
    }),
    // 테스트용 헬퍼
    __clearStore: () => {
      Object.keys(cookieStore).forEach((key) => delete cookieStore[key]);
    },
    __getStore: () => cookieStore,
  };
});

// Mock api-discovery
vi.mock("@/lib/api/hal/api-discovery", () => ({
  getCachedHref: vi.fn(() => "http://api.test.com/auth/refresh"),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// 유효한 JWT 토큰 생성 헬퍼
function createJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = "fake-signature";
  return `${header}.${body}.${signature}`;
}

describe("token-manager", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear cookie store
    const { __clearStore } = await import("@/lib/utils/cookie");
    (__clearStore as any)();
  });

  describe("setAccessToken / getAccessToken", () => {
    it("Access Token 저장 및 조회", async () => {
      const { setCookie, getCookie } = await import("@/lib/utils/cookie");

      setAccessToken("test-access-token");

      expect(setCookie).toHaveBeenCalledWith(
        "authToken",
        "test-access-token",
        expect.any(Number)
      );

      // Mock 반환값 설정
      (getCookie as any).mockReturnValueOnce("test-access-token");
      expect(getAccessToken()).toBe("test-access-token");
    });
  });

  describe("setRefreshToken / getRefreshToken", () => {
    it("Refresh Token 저장 및 조회", async () => {
      const { setCookie, getCookie } = await import("@/lib/utils/cookie");

      setRefreshToken("test-refresh-token");

      expect(setCookie).toHaveBeenCalledWith(
        "refreshToken",
        "test-refresh-token",
        expect.any(Number)
      );

      (getCookie as any).mockReturnValueOnce("test-refresh-token");
      expect(getRefreshToken()).toBe("test-refresh-token");
    });
  });

  describe("clearTokens", () => {
    it("모든 토큰 삭제", async () => {
      const { deleteCookie } = await import("@/lib/utils/cookie");

      clearTokens();

      expect(deleteCookie).toHaveBeenCalledWith("authToken");
      expect(deleteCookie).toHaveBeenCalledWith("refreshToken");
    });
  });

  describe("decodeToken", () => {
    it("JWT 페이로드 디코드", () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        exp: 1704067200,
      };
      const token = createJWT(payload);

      const result = decodeToken(token);

      expect(result.sub).toBe("user-123");
      expect(result.email).toBe("test@example.com");
      expect(result.exp).toBe(1704067200);
    });

    it("잘못된 토큰은 null 반환", () => {
      const result = decodeToken("invalid-token");

      expect(result).toBeNull();
    });

    it("빈 문자열은 null 반환", () => {
      const result = decodeToken("");

      expect(result).toBeNull();
    });
  });

  describe("isTokenExpired", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("만료된 토큰 감지", () => {
      vi.setSystemTime(new Date(1704067200000)); // 2024-01-01 00:00:00 UTC

      const expiredToken = createJWT({
        exp: 1704067199, // 1초 전에 만료
      });

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it("유효한 토큰", () => {
      vi.setSystemTime(new Date(1704067200000));

      const validToken = createJWT({
        exp: 1704153600, // 24시간 후 만료
      });

      expect(isTokenExpired(validToken)).toBe(false);
    });

    it("exp가 없는 토큰은 만료된 것으로 간주", () => {
      const tokenWithoutExp = createJWT({ sub: "user-123" });

      expect(isTokenExpired(tokenWithoutExp)).toBe(true);
    });

    it("잘못된 토큰은 만료된 것으로 간주", () => {
      expect(isTokenExpired("invalid")).toBe(true);
    });
  });

  describe("isTokenExpiringSoon", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("곧 만료될 토큰 감지 (기본 60초)", () => {
      vi.setSystemTime(new Date(1704067200000));

      const expiringSoonToken = createJWT({
        exp: 1704067230, // 30초 후 만료 (60초 버퍼 이내)
      });

      expect(isTokenExpiringSoon(expiringSoonToken)).toBe(true);
    });

    it("충분히 유효한 토큰", () => {
      vi.setSystemTime(new Date(1704067200000));

      const validToken = createJWT({
        exp: 1704067500, // 5분 후 만료
      });

      expect(isTokenExpiringSoon(validToken)).toBe(false);
    });

    it("커스텀 버퍼 시간", () => {
      vi.setSystemTime(new Date(1704067200000));

      const token = createJWT({
        exp: 1704067500, // 5분 후 만료
      });

      // 10분 버퍼: 곧 만료됨
      expect(isTokenExpiringSoon(token, 600)).toBe(true);

      // 1분 버퍼: 아직 여유 있음
      expect(isTokenExpiringSoon(token, 60)).toBe(false);
    });

    it("이미 만료된 토큰도 true", () => {
      vi.setSystemTime(new Date(1704067200000));

      const expiredToken = createJWT({
        exp: 1704067100, // 이미 만료
      });

      expect(isTokenExpiringSoon(expiredToken)).toBe(true);
    });
  });

  describe("refreshAccessToken", () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("토큰 갱신 성공", async () => {
      const { getCookie, setCookie } = await import("@/lib/utils/cookie");
      (getCookie as any).mockReturnValue("refresh-token");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
          }),
      });

      const result = await refreshAccessToken();

      expect(result).toBe("new-access-token");
      expect(setCookie).toHaveBeenCalledWith(
        "authToken",
        "new-access-token",
        expect.any(Number)
      );
    });

    it("Refresh Token 없으면 실패", async () => {
      const { getCookie, deleteCookie } = await import("@/lib/utils/cookie");
      (getCookie as any).mockReturnValue(null);

      const result = await refreshAccessToken();

      expect(result).toBeNull();
      expect(deleteCookie).toHaveBeenCalled();
    });

    it("API 에러 시 토큰 삭제", async () => {
      const { getCookie, deleteCookie } = await import("@/lib/utils/cookie");
      (getCookie as any).mockReturnValue("refresh-token");

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await refreshAccessToken();

      expect(result).toBeNull();
      expect(deleteCookie).toHaveBeenCalledWith("authToken");
      expect(deleteCookie).toHaveBeenCalledWith("refreshToken");
    });
  });

  describe("getValidAccessToken", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("Access Token 없으면 null", async () => {
      const { getCookie } = await import("@/lib/utils/cookie");
      (getCookie as any).mockReturnValue(null);

      const result = await getValidAccessToken();

      expect(result).toBeNull();
    });

    it("유효한 토큰은 그대로 반환", async () => {
      vi.setSystemTime(new Date(1704067200000));

      const { getCookie } = await import("@/lib/utils/cookie");
      const validToken = createJWT({ exp: 1704153600 }); // 24시간 후 만료
      (getCookie as any).mockReturnValue(validToken);

      const result = await getValidAccessToken();

      expect(result).toBe(validToken);
    });

    it("만료된 토큰은 갱신", async () => {
      vi.setSystemTime(new Date(1704067200000));

      const { getCookie, setCookie } = await import("@/lib/utils/cookie");
      const expiredToken = createJWT({ exp: 1704067100 }); // 이미 만료
      (getCookie as any)
        .mockReturnValueOnce(expiredToken) // getAccessToken
        .mockReturnValue("refresh-token"); // getRefreshToken

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: "new-token" }),
      });

      const result = await getValidAccessToken();

      expect(result).toBe("new-token");
    });
  });

  describe("getAuthHeaders", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("유효한 토큰이 있으면 Authorization 헤더 반환", async () => {
      vi.setSystemTime(new Date(1704067200000));

      const { getCookie } = await import("@/lib/utils/cookie");
      const validToken = createJWT({ exp: 1704153600 });
      (getCookie as any).mockReturnValue(validToken);

      const result = await getAuthHeaders();

      expect(result).toEqual({
        Authorization: `Bearer ${validToken}`,
      });
    });

    it("토큰 없으면 빈 객체", async () => {
      const { getCookie } = await import("@/lib/utils/cookie");
      (getCookie as any).mockReturnValue(null);

      const result = await getAuthHeaders();

      expect(result).toEqual({});
    });
  });
});

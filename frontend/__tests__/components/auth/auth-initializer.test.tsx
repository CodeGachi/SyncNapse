/**
 * AuthInitializer 컴포넌트 테스트
 * 앱 시작 시 토큰 유효성 검사
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { AuthInitializer } from "@/components/auth/auth-initializer";

// token-manager mock
vi.mock("@/lib/auth/token-manager", () => ({
  getAccessToken: vi.fn(),
  clearTokens: vi.fn(),
}));

// cookie mock
vi.mock("@/lib/utils/cookie", () => ({
  deleteCookie: vi.fn(),
}));

// logger mock
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getAccessToken, clearTokens } from "@/lib/auth/token-manager";
import { deleteCookie } from "@/lib/utils/cookie";

describe("AuthInitializer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("null 반환 (UI 없음)", () => {
      vi.mocked(getAccessToken).mockReturnValue(null);

      const { container } = render(<AuthInitializer />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("토큰 없음", () => {
    it("토큰 없으면 아무 동작 안함", () => {
      vi.mocked(getAccessToken).mockReturnValue(null);

      render(<AuthInitializer />);

      expect(clearTokens).not.toHaveBeenCalled();
      expect(deleteCookie).not.toHaveBeenCalled();
    });
  });

  describe("유효한 토큰", () => {
    it("mock 토큰은 정리 안함", () => {
      vi.mocked(getAccessToken).mockReturnValue("mock-token-123");

      render(<AuthInitializer />);

      expect(clearTokens).not.toHaveBeenCalled();
    });

    it("정상 JWT (3파트)는 정리 안함", () => {
      vi.mocked(getAccessToken).mockReturnValue("header.payload.signature");

      render(<AuthInitializer />);

      expect(clearTokens).not.toHaveBeenCalled();
    });
  });

  describe("잘못된 토큰 형식", () => {
    it("2파트 토큰은 정리", () => {
      vi.mocked(getAccessToken).mockReturnValue("invalid.token");

      render(<AuthInitializer />);

      expect(clearTokens).toHaveBeenCalled();
      expect(deleteCookie).toHaveBeenCalledWith("user");
    });

    it("1파트 토큰은 정리", () => {
      vi.mocked(getAccessToken).mockReturnValue("invalidtoken");

      render(<AuthInitializer />);

      expect(clearTokens).toHaveBeenCalled();
      expect(deleteCookie).toHaveBeenCalledWith("user");
    });

    it("4파트 이상 토큰은 정리", () => {
      vi.mocked(getAccessToken).mockReturnValue("a.b.c.d");

      render(<AuthInitializer />);

      expect(clearTokens).toHaveBeenCalled();
    });
  });
});

/**
 * LogoutHandler 컴포넌트 테스트
 * 로그아웃 처리 및 리다이렉트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LogoutHandler } from "@/components/auth/logout-handler";

// react-query mock
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    clear: vi.fn(),
  }),
}));

// API mocks
vi.mock("@/lib/api/services/auth.api", () => ({
  logout: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/auth/token-manager", () => ({
  clearTokens: vi.fn(),
}));

vi.mock("@/lib/utils/cookie", () => ({
  deleteCookie: vi.fn(),
}));

import { clearTokens } from "@/lib/auth/token-manager";
import { deleteCookie } from "@/lib/utils/cookie";

describe("LogoutHandler", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();

    // window.location mock
    delete (window as any).location;
    window.location = { href: "" } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe("렌더링", () => {
    it("로딩 화면 표시", () => {
      render(<LogoutHandler />);

      expect(screen.getByText("로그아웃 중...")).toBeInTheDocument();
    });
  });

  describe("로그아웃 프로세스", () => {
    it("토큰 제거 호출", async () => {
      render(<LogoutHandler />);

      await waitFor(() => {
        expect(clearTokens).toHaveBeenCalled();
      });
    });

    it("쿠키 삭제 호출", async () => {
      render(<LogoutHandler />);

      await waitFor(() => {
        expect(deleteCookie).toHaveBeenCalledWith("user");
      });
    });

    it("로그인 페이지로 리다이렉트", async () => {
      render(<LogoutHandler />);

      await waitFor(
        () => {
          expect(window.location.href).toBe("/login");
        },
        { timeout: 2000 }
      );
    });
  });

  describe("상태 메시지 변경", () => {
    it("리다이렉트 전 메시지 변경", async () => {
      render(<LogoutHandler />);

      // 초기 메시지
      expect(screen.getByText("로그아웃 중...")).toBeInTheDocument();

      // 리다이렉트 메시지로 변경됨
      await waitFor(() => {
        expect(screen.getByText("로그인 페이지로 이동 중...")).toBeInTheDocument();
      });
    });
  });
});

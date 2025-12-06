/**
 * AuthGuard 컴포넌트 테스트
 * 인증 가드 - 미인증 시 로그인 페이지로 리다이렉트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthGuard } from "@/components/auth/auth-guard";

// next/navigation mock
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// useAuth mock
const mockUseAuth = vi.fn();
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// logger mock
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("로딩 상태", () => {
    it("loading=true일 때 로딩 화면 표시", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: true,
        user: null,
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText("인증 확인 중...")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  describe("인증된 상태", () => {
    it("인증됐을 때 children 렌더링", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { email: "test@example.com" },
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("미인증 상태", () => {
    it("미인증일 때 로그인 페이지로 리다이렉트", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/login");
      });
    });

    it("미인증일 때 children 렌더링 안함", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  describe("상태 변화", () => {
    it("로딩 완료 후 인증 확인", async () => {
      // 처음에 로딩 중
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        loading: true,
        user: null,
      });

      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText("인증 확인 중...")).toBeInTheDocument();

      // 로딩 완료 후 인증됨
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { email: "test@example.com" },
      });

      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });
  });
});

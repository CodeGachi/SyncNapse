/**
 * LoginForm 컴포넌트 테스트
 * 로그인 폼 UI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";

// useLoginForm mock
const mockUseLoginForm = vi.fn();
vi.mock("@/features/auth/use-login-form", () => ({
  useLoginForm: () => mockUseLoginForm(),
}));

// GoogleLoginButton mock
vi.mock("@/components/auth/google-login-button", () => ({
  GoogleLoginButton: () => <button data-testid="google-login">Google Login</button>,
}));

// Logo mock
vi.mock("@/components/common/logo", () => ({
  Logo: ({ width, height }: { width: number; height: number }) => (
    <svg data-testid="logo" width={width} height={height} />
  ),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("로딩 상태", () => {
    it("loading=true일 때 로딩 화면", () => {
      mockUseLoginForm.mockReturnValue({
        isAuthenticated: false,
        loading: true,
      });

      render(<LoginForm />);

      expect(screen.getByText("로딩 중...")).toBeInTheDocument();
    });
  });

  describe("미인증 상태", () => {
    beforeEach(() => {
      mockUseLoginForm.mockReturnValue({
        isAuthenticated: false,
        loading: false,
      });
    });

    it("로고 표시", () => {
      render(<LoginForm />);

      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("SyncNapse 제목 표시", () => {
      render(<LoginForm />);

      expect(screen.getByText("SyncNapse")).toBeInTheDocument();
    });

    it("서비스 설명 표시", () => {
      render(<LoginForm />);

      expect(screen.getByText(/스마트한 필기 서비스로/)).toBeInTheDocument();
      expect(screen.getByText(/학습의 효율/)).toBeInTheDocument();
    });

    it("구글 로그인 버튼 표시", () => {
      render(<LoginForm />);

      expect(screen.getByTestId("google-login")).toBeInTheDocument();
    });

    it("저작권 표시", () => {
      render(<LoginForm />);

      expect(screen.getByText(/© 2025 SyncNapse/)).toBeInTheDocument();
    });
  });

  describe("인증된 상태", () => {
    it("isAuthenticated=true일 때 아무것도 렌더링 안함", () => {
      mockUseLoginForm.mockReturnValue({
        isAuthenticated: true,
        loading: false,
      });

      const { container } = render(<LoginForm />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("레이아웃", () => {
    beforeEach(() => {
      mockUseLoginForm.mockReturnValue({
        isAuthenticated: false,
        loading: false,
      });
    });

    it("전체 화면 레이아웃", () => {
      const { container } = render(<LoginForm />);

      const main = container.querySelector("main");
      expect(main).toHaveClass("min-h-screen", "flex", "flex-col", "items-center", "justify-center");
    });

    it("카드 스타일", () => {
      const { container } = render(<LoginForm />);

      const card = container.querySelector(".bg-background-surface\\/80");
      expect(card).toBeInTheDocument();
    });
  });
});

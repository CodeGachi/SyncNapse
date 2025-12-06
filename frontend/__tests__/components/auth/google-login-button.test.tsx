/**
 * GoogleLoginButton 컴포넌트 테스트
 * 구글 로그인 버튼
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoogleLoginButton } from "@/components/auth/google-login-button";

// useGoogleLogin mock
const mockHandleGoogleLogin = vi.fn();
vi.mock("@/features/auth/google-login", () => ({
  useGoogleLogin: () => ({
    handleGoogleLogin: mockHandleGoogleLogin,
  }),
}));

describe("GoogleLoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("버튼 텍스트 표시", () => {
      render(<GoogleLoginButton />);

      expect(screen.getByText("Google 계정으로 로그인하기")).toBeInTheDocument();
    });

    it("구글 아이콘 표시", () => {
      const { container } = render(<GoogleLoginButton />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("버튼 존재", () => {
      render(<GoogleLoginButton />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("클릭 동작", () => {
    it("클릭 시 handleGoogleLogin 호출", () => {
      render(<GoogleLoginButton />);

      fireEvent.click(screen.getByRole("button"));

      expect(mockHandleGoogleLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe("스타일", () => {
    it("흰색 배경 버튼", () => {
      render(<GoogleLoginButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-white");
    });

    it("호버 효과 클래스", () => {
      render(<GoogleLoginButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-gray-50");
    });
  });

  describe("구글 아이콘 색상", () => {
    it("4가지 색상 path 존재", () => {
      const { container } = render(<GoogleLoginButton />);

      const paths = container.querySelectorAll("path");
      expect(paths.length).toBe(4);

      // 구글 브랜드 색상
      const fills = Array.from(paths).map((p) => p.getAttribute("fill"));
      expect(fills).toContain("#4285F4"); // 파랑
      expect(fills).toContain("#34A853"); // 초록
      expect(fills).toContain("#FBBC05"); // 노랑
      expect(fills).toContain("#EA4335"); // 빨강
    });
  });
});

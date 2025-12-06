/**
 * OAuthCallback 컴포넌트 테스트
 * OAuth 인증 콜백 처리
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OAuthCallback } from "@/components/auth/oauth-callback";

// useOAuthCallback mock
const mockUseOAuthCallback = vi.fn();
vi.mock("@/features/auth/use-oauth-callback", () => ({
  useOAuthCallback: () => mockUseOAuthCallback(),
}));

describe("OAuthCallback", () => {
  describe("렌더링", () => {
    it("AuthLoading 컴포넌트 렌더링", () => {
      render(<OAuthCallback />);

      expect(screen.getByText("로그인 처리 중...")).toBeInTheDocument();
    });

    it("useOAuthCallback 훅 호출", () => {
      render(<OAuthCallback />);

      expect(mockUseOAuthCallback).toHaveBeenCalled();
    });
  });

  describe("전체 화면 로딩", () => {
    it("fullScreen 로딩 화면", () => {
      const { container } = render(<OAuthCallback />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("fixed", "inset-0");
    });
  });
});

/**
 * AuthLoading 컴포넌트 테스트
 * 인증 로딩 화면
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthLoading } from "@/components/auth/auth-loading";

describe("AuthLoading", () => {
  describe("렌더링", () => {
    it("로딩 메시지 표시", () => {
      render(<AuthLoading />);

      expect(screen.getByText("로그인 처리 중...")).toBeInTheDocument();
    });

    it("전체 화면 로딩", () => {
      const { container } = render(<AuthLoading />);

      // LoadingScreen fullScreen prop이 적용됨
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("fixed", "inset-0");
    });
  });
});

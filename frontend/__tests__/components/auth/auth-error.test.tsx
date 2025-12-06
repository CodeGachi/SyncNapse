/**
 * AuthError 컴포넌트 테스트
 * 인증 오류 표시 UI
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthError } from "@/components/auth/auth-error";

// next/navigation mock
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

describe("AuthError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("오류 아이콘 표시", () => {
      render(<AuthError error="테스트 오류" />);

      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("제목 표시", () => {
      render(<AuthError error="테스트 오류" />);

      expect(screen.getByText("로그인 실패")).toBeInTheDocument();
    });

    it("오류 메시지 표시", () => {
      render(<AuthError error="인증 토큰이 만료되었습니다." />);

      expect(screen.getByText("인증 토큰이 만료되었습니다.")).toBeInTheDocument();
    });

    it("로그인 페이지 버튼 표시", () => {
      render(<AuthError error="오류" />);

      expect(screen.getByRole("button", { name: "로그인 페이지로 돌아가기" })).toBeInTheDocument();
    });
  });

  describe("동작", () => {
    it("버튼 클릭 시 로그인 페이지로 이동", () => {
      render(<AuthError error="오류" />);

      fireEvent.click(screen.getByRole("button", { name: "로그인 페이지로 돌아가기" }));

      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  describe("다양한 에러 메시지", () => {
    it("긴 에러 메시지", () => {
      const longError = "이것은 매우 긴 에러 메시지입니다. ".repeat(5);
      render(<AuthError error={longError} />);

      // 에러 메시지가 표시되는지 확인 (실제 텍스트는 트림될 수 있음)
      expect(screen.getByText(/이것은 매우 긴 에러 메시지입니다/)).toBeInTheDocument();
    });

    it("빈 에러 메시지", () => {
      render(<AuthError error="" />);

      expect(screen.getByText("로그인 실패")).toBeInTheDocument();
    });
  });

  describe("스타일", () => {
    it("전체 화면 레이아웃", () => {
      const { container } = render(<AuthError error="오류" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-screen", "flex", "items-center", "justify-center");
    });

    it("에러 보더 스타일", () => {
      const { container } = render(<AuthError error="오류" />);

      const card = container.querySelector(".border-status-error\\/30");
      expect(card).toBeInTheDocument();
    });
  });
});

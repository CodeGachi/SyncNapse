/**
 * Navbar 컴포넌트 테스트
 * 랜딩 페이지 네비게이션 바
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navbar } from "@/components/landing/navbar";

describe("Navbar", () => {
  describe("렌더링", () => {
    it("로고 렌더링", () => {
      const { container } = render(<Navbar />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("SyncNapse 텍스트", () => {
      render(<Navbar />);

      expect(screen.getByText("SyncNapse")).toBeInTheDocument();
    });

    it("로그인 버튼", () => {
      render(<Navbar />);

      expect(screen.getByText("로그인")).toBeInTheDocument();
    });
  });

  describe("링크", () => {
    it("로고 링크는 홈으로", () => {
      render(<Navbar />);

      const logoLink = screen.getByRole("link", { name: /SyncNapse/i });
      expect(logoLink).toHaveAttribute("href", "/");
    });

    it("로그인 링크", () => {
      render(<Navbar />);

      const loginLink = screen.getByRole("link", { name: /로그인/i });
      expect(loginLink).toHaveAttribute("href", "/login");
    });
  });

  describe("스타일", () => {
    it("고정 위치", () => {
      const { container } = render(<Navbar />);

      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("fixed", "top-0");
    });

    it("z-index 설정", () => {
      const { container } = render(<Navbar />);

      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("z-50");
    });
  });
});

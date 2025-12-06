/**
 * Footer 컴포넌트 테스트
 * 랜딩 페이지 푸터
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/landing/footer";

describe("Footer", () => {
  describe("렌더링", () => {
    it("로고 렌더링", () => {
      const { container } = render(<Footer />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("저작권 표시", () => {
      render(<Footer />);

      expect(screen.getByText(/© 2025 SyncNapse/)).toBeInTheDocument();
    });

    it("Privacy 링크", () => {
      render(<Footer />);

      expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    it("Terms 링크", () => {
      render(<Footer />);

      expect(screen.getByText("Terms")).toBeInTheDocument();
    });
  });

  describe("레이아웃", () => {
    it("footer 태그 사용", () => {
      const { container } = render(<Footer />);

      expect(container.querySelector("footer")).toBeInTheDocument();
    });

    it("상단 보더", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("border-t");
    });
  });
});

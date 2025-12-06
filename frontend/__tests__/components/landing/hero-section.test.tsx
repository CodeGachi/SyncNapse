/**
 * HeroSection 컴포넌트 테스트
 * 랜딩 페이지 히어로 섹션
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/landing/hero-section";

describe("HeroSection", () => {
  describe("렌더링", () => {
    it("메인 헤드라인", () => {
      render(<HeroSection />);

      expect(screen.getByText("지식이,")).toBeInTheDocument();
      expect(screen.getByText("동기화되다.")).toBeInTheDocument();
    });

    it("서브 헤드라인", () => {
      render(<HeroSection />);

      expect(screen.getByText(/듣고, 기록하고, 연결하는/)).toBeInTheDocument();
    });

    it("CTA 버튼", () => {
      render(<HeroSection />);

      expect(screen.getByText("무료로 시작하기")).toBeInTheDocument();
    });
  });

  describe("링크", () => {
    it("CTA 버튼 링크", () => {
      render(<HeroSection />);

      const ctaLink = screen.getByRole("link", { name: /무료로 시작하기/i });
      expect(ctaLink).toHaveAttribute("href", "/login");
    });
  });

  describe("레이아웃", () => {
    it("section 태그 사용", () => {
      const { container } = render(<HeroSection />);

      expect(container.querySelector("section")).toBeInTheDocument();
    });

    it("중앙 정렬", () => {
      const { container } = render(<HeroSection />);

      const centerDiv = container.querySelector(".text-center");
      expect(centerDiv).toBeInTheDocument();
    });
  });

  describe("대시보드 프리뷰", () => {
    it("모킵 UI 렌더링", () => {
      const { container } = render(<HeroSection />);

      // 모킵 창 컨트롤 (둥근 원 3개)
      const mockControls = container.querySelectorAll(".rounded-full");
      expect(mockControls.length).toBeGreaterThan(0);
    });
  });
});

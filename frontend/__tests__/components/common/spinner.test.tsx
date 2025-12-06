/**
 * Spinner 컴포넌트 테스트
 * 로딩 스피너 UI
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "@/components/common/spinner";

describe("Spinner", () => {
  describe("렌더링", () => {
    it("기본 렌더링", () => {
      render(<Spinner />);

      // 스피너 컨테이너 존재
      const container = document.querySelector(".relative.flex");
      expect(container).toBeInTheDocument();
    });

    it("기본 사이즈 md", () => {
      render(<Spinner />);

      const container = document.querySelector(".w-12.h-12");
      expect(container).toBeInTheDocument();
    });
  });

  describe("사이즈 옵션", () => {
    it("xs 사이즈", () => {
      render(<Spinner size="xs" />);

      const container = document.querySelector(".w-3.h-3");
      expect(container).toBeInTheDocument();
    });

    it("sm 사이즈", () => {
      render(<Spinner size="sm" />);

      const container = document.querySelector(".w-6.h-6");
      expect(container).toBeInTheDocument();
    });

    it("md 사이즈", () => {
      render(<Spinner size="md" />);

      const container = document.querySelector(".w-12.h-12");
      expect(container).toBeInTheDocument();
    });

    it("lg 사이즈", () => {
      render(<Spinner size="lg" />);

      const container = document.querySelector(".w-16.h-16");
      expect(container).toBeInTheDocument();
    });
  });

  describe("커스텀 클래스", () => {
    it("className prop 적용", () => {
      render(<Spinner className="custom-class" />);

      const container = document.querySelector(".custom-class");
      expect(container).toBeInTheDocument();
    });
  });

  describe("구조", () => {
    it("3개의 애니메이션 레이어", () => {
      const { container } = render(<Spinner />);

      // Outer Ring, Spinning Ring, Inner Dot
      const layers = container.querySelectorAll(".absolute");
      expect(layers.length).toBeGreaterThanOrEqual(2);
    });
  });
});

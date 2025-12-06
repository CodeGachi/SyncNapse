/**
 * Logo 컴포넌트 테스트
 * SVG 로고
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "@/components/common/logo";

describe("Logo", () => {
  describe("기본 렌더링", () => {
    it("SVG 렌더링", () => {
      const { container } = render(<Logo />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("기본 크기 42x42", () => {
      const { container } = render(<Logo />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "42");
      expect(svg).toHaveAttribute("height", "42");
    });

    it("viewBox 설정", () => {
      const { container } = render(<Logo />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 42 42");
    });
  });

  describe("크기 props", () => {
    it("커스텀 width", () => {
      const { container } = render(<Logo width={100} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "100");
    });

    it("커스텀 height", () => {
      const { container } = render(<Logo height={100} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("height", "100");
    });

    it("커스텀 width와 height", () => {
      const { container } = render(<Logo width={80} height={80} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "80");
      expect(svg).toHaveAttribute("height", "80");
    });
  });

  describe("className prop", () => {
    it("커스텀 클래스 적용", () => {
      const { container } = render(<Logo className="custom-logo" />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("custom-logo");
    });
  });

  describe("SVG 구조", () => {
    it("path 요소 포함", () => {
      const { container } = render(<Logo />);

      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
    });

    it("검정과 흰색 path", () => {
      const { container } = render(<Logo />);

      const whitePaths = container.querySelectorAll('path[fill="white"]');
      const blackPaths = container.querySelectorAll('path[fill="black"]');

      expect(whitePaths.length).toBeGreaterThan(0);
      expect(blackPaths.length).toBeGreaterThan(0);
    });
  });
});

/**
 * LoadingScreen 컴포넌트 테스트
 * 전체 화면 또는 부분 로딩 화면
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingScreen } from "@/components/common/loading-screen";

describe("LoadingScreen", () => {
  describe("기본 렌더링", () => {
    it("기본 메시지 표시", () => {
      render(<LoadingScreen />);

      expect(screen.getByText("로딩 중...")).toBeInTheDocument();
    });

    it("Spinner 컴포넌트 포함", () => {
      const { container } = render(<LoadingScreen />);

      // Spinner는 상대적 위치를 가진 div
      const spinner = container.querySelector(".relative.flex");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("message prop", () => {
    it("커스텀 메시지 표시", () => {
      render(<LoadingScreen message="데이터 불러오는 중..." />);

      expect(screen.getByText("데이터 불러오는 중...")).toBeInTheDocument();
    });

    it("빈 메시지일 때 텍스트 숨김", () => {
      render(<LoadingScreen message="" />);

      expect(screen.queryByText("로딩 중...")).not.toBeInTheDocument();
    });
  });

  describe("fullScreen prop", () => {
    it("fullScreen=false (기본)", () => {
      const { container } = render(<LoadingScreen />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("w-full", "h-full");
      expect(wrapper).not.toHaveClass("fixed");
    });

    it("fullScreen=true", () => {
      const { container } = render(<LoadingScreen fullScreen />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("fixed", "inset-0", "z-50");
    });
  });

  describe("className prop", () => {
    it("커스텀 클래스 적용", () => {
      const { container } = render(<LoadingScreen className="custom-loading" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-loading");
    });
  });

  describe("레이아웃", () => {
    it("중앙 정렬", () => {
      const { container } = render(<LoadingScreen />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "flex-col", "items-center", "justify-center");
    });

    it("최소 높이 보장", () => {
      const { container } = render(<LoadingScreen />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-[200px]");
    });
  });
});

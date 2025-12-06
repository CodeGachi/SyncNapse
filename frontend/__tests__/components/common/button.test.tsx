/**
 * Button 컴포넌트 테스트
 * 다양한 variant와 size를 지원하는 버튼
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/common/button";

describe("Button", () => {
  describe("기본 렌더링", () => {
    it("children 렌더링", () => {
      render(<Button>클릭</Button>);

      expect(screen.getByRole("button", { name: "클릭" })).toBeInTheDocument();
    });

    it("기본 variant는 primary", () => {
      render(<Button>버튼</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-brand");
    });

    it("기본 size는 md", () => {
      render(<Button>버튼</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-11");
    });
  });

  describe("Variant", () => {
    it("primary", () => {
      render(<Button variant="primary">Primary</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-brand");
    });

    it("brand", () => {
      render(<Button variant="brand">Brand</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-brand-secondary");
    });

    it("secondary", () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-foreground/10");
    });

    it("outline", () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-2", "border-brand");
    });

    it("ghost", () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-foreground-secondary");
    });

    it("glass", () => {
      render(<Button variant="glass">Glass</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("backdrop-blur-md");
    });

    it("danger", () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-status-error");
    });
  });

  describe("Size", () => {
    it("sm", () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-9", "px-4", "text-sm");
    });

    it("md", () => {
      render(<Button size="md">Medium</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-11", "px-6", "text-base");
    });

    it("lg", () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-14", "px-8", "text-lg");
    });

    it("icon", () => {
      render(<Button size="icon">🔍</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10", "w-10", "p-0");
    });
  });

  describe("이벤트", () => {
    it("onClick 호출", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>클릭</Button>);

      fireEvent.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disabled 상태에서 클릭 불가", () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          비활성화
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("속성", () => {
    it("disabled 스타일 적용", () => {
      render(<Button disabled>비활성화</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("type 속성", () => {
      render(<Button type="submit">제출</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("커스텀 className 병합", () => {
      render(<Button className="custom-class">버튼</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("ref 전달", () => {
    it("forwardRef 동작", () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>버튼</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});

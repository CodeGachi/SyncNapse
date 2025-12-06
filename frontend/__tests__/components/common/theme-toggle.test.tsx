/**
 * ThemeToggle 컴포넌트 테스트
 * 다크/라이트 모드 토글
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeToggle } from "@/components/common/theme-toggle";

// next-themes mock
const mockSetTheme = vi.fn();
let mockTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
  });

  describe("렌더링", () => {
    it("마운트 후 렌더링", async () => {
      render(<ThemeToggle />);

      // mounted 후에만 렌더링됨
      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });
    });
  });

  describe("라이트 모드", () => {
    beforeEach(() => {
      mockTheme = "light";
    });

    it("라이트 모드 라벨 표시", async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByText("라이트 모드")).toBeInTheDocument();
      });
    });

    it("클릭 시 다크 모드로 전환", async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button"));

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  describe("다크 모드", () => {
    beforeEach(() => {
      mockTheme = "dark";
    });

    it("다크 모드 라벨 표시", async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByText("다크 모드")).toBeInTheDocument();
      });
    });

    it("클릭 시 라이트 모드로 전환", async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button"));

      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });
  });

  describe("showLabel prop", () => {
    it("showLabel=true (기본값)", async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByText("라이트 모드")).toBeInTheDocument();
      });
    });

    it("showLabel=false", async () => {
      render(<ThemeToggle showLabel={false} />);

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      expect(screen.queryByText("라이트 모드")).not.toBeInTheDocument();
      expect(screen.queryByText("다크 모드")).not.toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("커스텀 클래스 적용", async () => {
      render(<ThemeToggle className="custom-toggle" />);

      await waitFor(() => {
        expect(screen.getByRole("button")).toHaveClass("custom-toggle");
      });
    });
  });

  describe("아이콘", () => {
    it("라이트 모드에서 태양 아이콘", async () => {
      mockTheme = "light";
      const { container } = render(<ThemeToggle />);

      await waitFor(() => {
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });

    it("다크 모드에서 달 아이콘", async () => {
      mockTheme = "dark";
      const { container } = render(<ThemeToggle />);

      await waitFor(() => {
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });
});

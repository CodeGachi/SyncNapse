/**
 * StatCard 컴포넌트 테스트
 * 통계 카드
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/admin/common/stat-card";
import { MantineProvider } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";

// Wrapper component for Mantine
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe("StatCard", () => {
  describe("기본 렌더링", () => {
    it("제목 표시", () => {
      render(<StatCard title="총 사용자" value={1234} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByText("총 사용자")).toBeInTheDocument();
    });

    it("숫자 값 로케일 포맷팅", () => {
      render(<StatCard title="총 사용자" value={1234567} />, {
        wrapper: TestWrapper,
      });

      // 로케일에 따라 1,234,567 또는 다른 형식
      expect(screen.getByText(/1.*234.*567/)).toBeInTheDocument();
    });

    it("문자열 값 표시", () => {
      render(<StatCard title="매출" value="$1,234.56" />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    });
  });

  describe("아이콘", () => {
    it("아이콘 표시", () => {
      render(
        <StatCard
          title="사용자"
          value={100}
          icon={<IconUsers data-testid="user-icon" />}
        />,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId("user-icon")).toBeInTheDocument();
    });

    it("아이콘 없이 렌더링", () => {
      render(<StatCard title="통계" value={50} />, { wrapper: TestWrapper });

      expect(screen.getByText("통계")).toBeInTheDocument();
    });
  });

  describe("변화율 (change)", () => {
    it("양수 변화율", () => {
      render(<StatCard title="매출" value={1000} change={12.5} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByText("+12.5%")).toBeInTheDocument();
    });

    it("음수 변화율", () => {
      render(<StatCard title="매출" value={1000} change={-8.3} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByText("-8.3%")).toBeInTheDocument();
    });

    it("0 변화율", () => {
      render(<StatCard title="매출" value={1000} change={0} />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("변화율 없음", () => {
      render(<StatCard title="매출" value={1000} />, { wrapper: TestWrapper });

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe("설명", () => {
    it("설명 텍스트 표시", () => {
      render(
        <StatCard title="활성 사용자" value={500} description="지난 30일" />,
        { wrapper: TestWrapper }
      );

      expect(screen.getByText("지난 30일")).toBeInTheDocument();
    });

    it("변화율과 설명 함께 표시", () => {
      render(
        <StatCard
          title="활성 사용자"
          value={500}
          change={5.2}
          description="전월 대비"
        />,
        { wrapper: TestWrapper }
      );

      expect(screen.getByText("+5.2%")).toBeInTheDocument();
      expect(screen.getByText("전월 대비")).toBeInTheDocument();
    });
  });

  describe("로딩 상태", () => {
    it("로딩 중일 때 값 숨김", () => {
      render(<StatCard title="통계" value={1000} loading />, {
        wrapper: TestWrapper,
      });

      expect(screen.getByText("통계")).toBeInTheDocument();
      expect(screen.queryByText("1,000")).not.toBeInTheDocument();
    });

    it("로딩 중일 때 변화율 숨김", () => {
      render(<StatCard title="통계" value={1000} change={10} loading />, {
        wrapper: TestWrapper,
      });

      expect(screen.queryByText("+10.0%")).not.toBeInTheDocument();
    });
  });
});

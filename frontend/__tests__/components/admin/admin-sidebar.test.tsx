/**
 * AdminSidebar 컴포넌트 테스트
 * 관리자 사이드바 네비게이션
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { MantineProvider } from "@mantine/core";

// next/navigation mock
const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Wrapper component for Mantine
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe("AdminSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/admin");
  });

  describe("렌더링", () => {
    it("로고 표시", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      expect(screen.getByText("SyncNapse")).toBeInTheDocument();
      expect(screen.getByText("Admin Console")).toBeInTheDocument();
    });

    it("네비게이션 항목들 표시", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      expect(screen.getByText("운영 대시보드")).toBeInTheDocument();
      expect(screen.getByText("사용자 관리")).toBeInTheDocument();
      expect(screen.getByText("요금제 관리")).toBeInTheDocument();
      expect(screen.getByText("구독 분석")).toBeInTheDocument();
      expect(screen.getByText("서버 상태")).toBeInTheDocument();
      expect(screen.getByText("시스템 설정")).toBeInTheDocument();
    });

    it("네비게이션 항목 설명 표시", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      expect(screen.getByText("시스템 상태 및 개요")).toBeInTheDocument();
      expect(screen.getByText("사용자 조회 및 관리")).toBeInTheDocument();
      expect(screen.getByText("요금제 설정 및 관리")).toBeInTheDocument();
    });

    it("대시보드로 돌아가기 링크", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      expect(screen.getByText("대시보드로 돌아가기")).toBeInTheDocument();
    });
  });

  describe("링크 href", () => {
    it("운영 대시보드 링크", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      const dashboardLink = screen.getByText("운영 대시보드").closest("a");
      expect(dashboardLink).toHaveAttribute("href", "/admin");
    });

    it("사용자 관리 링크", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      const usersLink = screen.getByText("사용자 관리").closest("a");
      expect(usersLink).toHaveAttribute("href", "/admin/users");
    });

    it("대시보드로 돌아가기 링크", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      const backLink = screen.getByText("대시보드로 돌아가기").closest("a");
      expect(backLink).toHaveAttribute("href", "/dashboard/main");
    });
  });

  describe("활성 상태", () => {
    it("/admin 경로에서 운영 대시보드 활성화", () => {
      mockPathname.mockReturnValue("/admin");
      render(<AdminSidebar />, { wrapper: TestWrapper });

      const dashboardLink = screen.getByText("운영 대시보드").closest("a");
      expect(dashboardLink).toHaveAttribute("data-active", "true");
    });

    it("/admin/users 경로에서 사용자 관리 활성화", () => {
      mockPathname.mockReturnValue("/admin/users");
      render(<AdminSidebar />, { wrapper: TestWrapper });

      const usersLink = screen.getByText("사용자 관리").closest("a");
      expect(usersLink).toHaveAttribute("data-active", "true");

      // 운영 대시보드는 비활성화
      const dashboardLink = screen.getByText("운영 대시보드").closest("a");
      expect(dashboardLink).not.toHaveAttribute("data-active", "true");
    });

    it("/admin/plans 경로에서 요금제 관리 활성화", () => {
      mockPathname.mockReturnValue("/admin/plans");
      render(<AdminSidebar />, { wrapper: TestWrapper });

      const plansLink = screen.getByText("요금제 관리").closest("a");
      expect(plansLink).toHaveAttribute("data-active", "true");
    });
  });

  describe("네비게이션 아이콘", () => {
    it("아이콘이 포함된 네비게이션 항목", () => {
      render(<AdminSidebar />, { wrapper: TestWrapper });

      // SVG 아이콘들이 렌더링되는지 확인
      const navItems = screen.getAllByRole("link");
      expect(navItems.length).toBeGreaterThan(0);
    });
  });
});

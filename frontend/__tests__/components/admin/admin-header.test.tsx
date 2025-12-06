/**
 * AdminHeader 컴포넌트 테스트
 * 관리자 헤더 (브레드크럼, 사용자 메뉴)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminHeader } from "@/components/admin/admin-header";
import { MantineProvider } from "@mantine/core";

// next/navigation mock
const mockPathname = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: mockPush,
  }),
}));

// useAuth mock
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => ({
    user: {
      name: "테스트 관리자",
      email: "admin@test.com",
      picture: null,
    },
  }),
}));

// useIsAdmin mock
vi.mock("@/components/admin/admin-guard", () => ({
  useIsAdmin: () => ({
    role: "admin",
    isAdmin: true,
    isOperator: false,
    loading: false,
  }),
}));

// token-manager mock
vi.mock("@/lib/auth/token-manager", () => ({
  clearTokens: vi.fn(),
}));

// cookie mock
vi.mock("@/lib/utils/cookie", () => ({
  deleteCookie: vi.fn(),
}));

// Wrapper component for Mantine
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe("AdminHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/admin");
  });

  describe("렌더링", () => {
    it("관리자 배지 표시", () => {
      render(<AdminHeader />, { wrapper: TestWrapper });

      // Badge 컴포넌트 안에 관리자 텍스트 확인
      const badge = document.querySelector('[class*="Badge-root"]');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe("관리자");
    });

    it("사용자 이름 표시", () => {
      render(<AdminHeader />, { wrapper: TestWrapper });

      expect(screen.getByText("테스트 관리자")).toBeInTheDocument();
    });

    it("사용자 아바타 표시", () => {
      render(<AdminHeader />, { wrapper: TestWrapper });

      // 첫 글자가 아바타에 표시됨
      expect(screen.getByText("테")).toBeInTheDocument();
    });
  });

  describe("브레드크럼", () => {
    it("/admin 경로 브레드크럼", () => {
      mockPathname.mockReturnValue("/admin");
      render(<AdminHeader />, { wrapper: TestWrapper });

      // 브레드크럼에 관리자가 포함되어 있는지 확인
      const breadcrumbs = document.querySelector('[class*="Breadcrumbs"]');
      expect(breadcrumbs).toBeInTheDocument();
    });

    it("/admin/users 경로 브레드크럼", () => {
      mockPathname.mockReturnValue("/admin/users");
      render(<AdminHeader />, { wrapper: TestWrapper });

      // 사용자 관리 텍스트가 표시되는지 확인
      expect(screen.getByText("사용자 관리")).toBeInTheDocument();
    });

    it("/admin/plans 경로 브레드크럼", () => {
      mockPathname.mockReturnValue("/admin/plans");
      render(<AdminHeader />, { wrapper: TestWrapper });

      expect(screen.getByText("요금제 관리")).toBeInTheDocument();
    });
  });

  describe("사용자 메뉴", () => {
    it("메뉴 열기", async () => {
      render(<AdminHeader />, { wrapper: TestWrapper });

      // 아바타 영역 클릭
      const avatarArea = screen.getByText("테스트 관리자").closest("div");
      if (avatarArea) {
        fireEvent.click(avatarArea);
      }

      await waitFor(() => {
        expect(screen.getByText("계정")).toBeInTheDocument();
        expect(screen.getByText("프로필")).toBeInTheDocument();
        expect(screen.getByText("로그아웃")).toBeInTheDocument();
      });
    });

    it("프로필 링크", async () => {
      render(<AdminHeader />, { wrapper: TestWrapper });

      const avatarArea = screen.getByText("테스트 관리자").closest("div");
      if (avatarArea) {
        fireEvent.click(avatarArea);
      }

      await waitFor(() => {
        const profileLink = screen.getByText("프로필").closest("a, button");
        expect(profileLink).toBeInTheDocument();
      });
    });

    it("로그아웃 클릭", async () => {
      const { clearTokens } = await import("@/lib/auth/token-manager");
      const { deleteCookie } = await import("@/lib/utils/cookie");

      render(<AdminHeader />, { wrapper: TestWrapper });

      const avatarArea = screen.getByText("테스트 관리자").closest("div");
      if (avatarArea) {
        fireEvent.click(avatarArea);
      }

      await waitFor(() => {
        expect(screen.getByText("로그아웃")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("로그아웃"));

      expect(clearTokens).toHaveBeenCalled();
      expect(deleteCookie).toHaveBeenCalledWith("user");
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});

/**
 * AdminLayout 컴포넌트 테스트
 * 관리자 페이지 레이아웃
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { MantineProvider } from "@mantine/core";

// next/navigation mock
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

// useAuth mock
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => ({
    user: { role: "admin", name: "Admin User" },
    loading: false,
    isAuthenticated: true,
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

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("렌더링", () => {
    it("자식 콘텐츠 렌더링", async () => {
      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Page Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByTestId("admin-content")).toBeInTheDocument();
        expect(screen.getByText("Admin Page Content")).toBeInTheDocument();
      });
    });

    it("사이드바 렌더링", async () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByText("SyncNapse")).toBeInTheDocument();
        expect(screen.getByText("Admin Console")).toBeInTheDocument();
      });
    });

    it("헤더 렌더링", async () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByText("Admin User")).toBeInTheDocument();
      });
    });

    it("네비게이션 항목들 표시", async () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(screen.getByText("운영 대시보드")).toBeInTheDocument();
        expect(screen.getByText("사용자 관리")).toBeInTheDocument();
        expect(screen.getByText("요금제 관리")).toBeInTheDocument();
      });
    });
  });

  describe("레이아웃 구조", () => {
    it("main 요소 존재", async () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const main = document.querySelector("main");
        expect(main).toBeInTheDocument();
      });
    });

    it("nav 요소 존재 (사이드바)", async () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const nav = document.querySelector("nav");
        expect(nav).toBeInTheDocument();
      });
    });

    it("header 요소 존재", async () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const header = document.querySelector("header");
        expect(header).toBeInTheDocument();
      });
    });
  });
});

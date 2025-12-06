/**
 * AdminGuard 컴포넌트 테스트
 * 관리자/운영자 권한 확인 가드
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminGuard, AdminOnlyGuard, useIsAdmin } from "@/components/admin/admin-guard";
import { renderHook } from "@testing-library/react";

// next/navigation mock
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// useAuth mock
const mockUseAuth = vi.fn();
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("로딩 상태", () => {
    it("로딩 중일 때 로딩 화면 표시", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("권한을 확인하고 있습니다...")).toBeInTheDocument();
    });
  });

  describe("인증되지 않은 경우", () => {
    it("로그인 페이지로 리다이렉트", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("권한 확인", () => {
    it("admin 역할일 때 콘텐츠 표시", async () => {
      mockUseAuth.mockReturnValue({
        user: { role: "admin", name: "Admin User" },
        loading: false,
        isAuthenticated: true,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Content")).toBeInTheDocument();
      });
    });

    it("operator 역할일 때 콘텐츠 표시", async () => {
      mockUseAuth.mockReturnValue({
        user: { role: "operator", name: "Operator User" },
        loading: false,
        isAuthenticated: true,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Content")).toBeInTheDocument();
      });
    });

    it("user 역할일 때 리다이렉트", async () => {
      mockUseAuth.mockReturnValue({
        user: { role: "user", name: "Normal User" },
        loading: false,
        isAuthenticated: true,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/main");
      });
    });
  });

  describe("allowedRoles 옵션", () => {
    it("커스텀 allowedRoles 지정", async () => {
      mockUseAuth.mockReturnValue({
        user: { role: "operator", name: "Operator User" },
        loading: false,
        isAuthenticated: true,
      });

      render(
        <AdminGuard allowedRoles={["admin"]}>
          <div>Admin Only Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/main");
      });
    });
  });

  describe("redirectTo 옵션", () => {
    it("커스텀 리다이렉트 경로", async () => {
      mockUseAuth.mockReturnValue({
        user: { role: "user", name: "Normal User" },
        loading: false,
        isAuthenticated: true,
      });

      render(
        <AdminGuard redirectTo="/custom-path">
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/custom-path");
      });
    });
  });

  describe("Mock 모드", () => {
    it("localStorage에서 역할 확인", async () => {
      localStorage.setItem("mockUserRole", "admin");
      mockUseAuth.mockReturnValue({
        user: {}, // role 필드 없음
        loading: false,
        isAuthenticated: true,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Content")).toBeInTheDocument();
      });
    });
  });
});

describe("AdminOnlyGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("admin 역할만 허용", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "operator", name: "Operator User" },
      loading: false,
      isAuthenticated: true,
    });

    render(
      <AdminOnlyGuard>
        <div>Admin Only Content</div>
      </AdminOnlyGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard/main");
    });
  });

  it("admin 역할일 때 콘텐츠 표시", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "admin", name: "Admin User" },
      loading: false,
      isAuthenticated: true,
    });

    render(
      <AdminOnlyGuard>
        <div>Admin Only Content</div>
      </AdminOnlyGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Only Content")).toBeInTheDocument();
    });
  });
});

describe("useIsAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("admin 역할 확인", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "admin" },
      loading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOperator).toBe(false);
      expect(result.current.role).toBe("admin");
    });
  });

  it("operator 역할 확인", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "operator" },
      loading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOperator).toBe(true);
      expect(result.current.role).toBe("operator");
    });
  });

  it("user 역할 확인", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "user" },
      loading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOperator).toBe(false);
      expect(result.current.role).toBe("user");
    });
  });

  it("로딩 상태", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.loading).toBe(true);
  });
});

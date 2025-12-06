/**
 * use-login-form 테스트
 * 로그인 폼 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLoginForm } from "@/features/auth/use-login-form";

// Mock dependencies
const mockReplace = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useAuth } from "@/features/auth/use-auth";

describe("useLoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGet.mockReturnValue(null);
  });

  describe("returnUrl 저장", () => {
    it("returnUrl 쿼리 파라미터 저장", () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "returnUrl") return "/dashboard/notes";
        return null;
      });
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        loading: false,
      });

      renderHook(() => useLoginForm());

      expect(localStorage.getItem("redirectAfterLogin")).toBe("/dashboard/notes");
    });

    it("callbackUrl 쿼리 파라미터 저장", () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "callbackUrl") return "/note/123";
        return null;
      });
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        loading: false,
      });

      renderHook(() => useLoginForm());

      expect(localStorage.getItem("redirectAfterLogin")).toBe("/note/123");
    });

    it("루트 URL은 저장하지 않음", () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "returnUrl") return "/";
        return null;
      });
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        loading: false,
      });

      renderHook(() => useLoginForm());

      expect(localStorage.getItem("redirectAfterLogin")).toBeNull();
    });

    it("/auth로 시작하는 URL은 저장하지 않음", () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "returnUrl") return "/auth/login";
        return null;
      });
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        loading: false,
      });

      renderHook(() => useLoginForm());

      expect(localStorage.getItem("redirectAfterLogin")).toBeNull();
    });
  });

  describe("인증된 사용자 리다이렉트", () => {
    it("이미 인증되면 저장된 URL로 리다이렉트", async () => {
      localStorage.setItem("redirectAfterLogin", "/note/123");
      (useAuth as any).mockReturnValue({
        isAuthenticated: true,
        loading: false,
      });

      renderHook(() => useLoginForm());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/note/123");
      });
      expect(localStorage.getItem("redirectAfterLogin")).toBeNull();
    });

    it("저장된 URL 없으면 대시보드로 리다이렉트", async () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: true,
        loading: false,
      });

      renderHook(() => useLoginForm());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/main");
      });
    });

    it("로딩 중이면 리다이렉트하지 않음", () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: true,
        loading: true,
      });

      renderHook(() => useLoginForm());

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("반환값", () => {
    it("isAuthenticated와 loading 반환", () => {
      (useAuth as any).mockReturnValue({
        isAuthenticated: false,
        loading: true,
      });

      const { result } = renderHook(() => useLoginForm());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(true);
    });
  });
});

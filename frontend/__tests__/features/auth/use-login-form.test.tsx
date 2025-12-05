/**
 * useLoginForm 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLoginForm } from "@/features/auth/use-login-form";
import * as useAuthModule from "@/features/auth/use-auth";
import { ReactNode } from "react";

// Mock next/navigation
const mockRouterReplace = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

// Mock useAuth
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

describe("useLoginForm", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("로딩 중일 때 loading이 true를 반환", () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: true,
      user: null,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    const { result } = renderHook(() => useLoginForm(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returnUrl 파라미터가 있으면 localStorage에 저장", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === "returnUrl") return "/dashboard/notes";
      return null;
    });

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem("redirectAfterLogin")).toBe("/dashboard/notes");
    });
  });

  it("callbackUrl 파라미터가 있으면 localStorage에 저장", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === "callbackUrl") return "/note?id=123";
      return null;
    });

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem("redirectAfterLogin")).toBe("/note?id=123");
    });
  });

  it("returnUrl이 '/'면 저장하지 않음", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === "returnUrl") return "/";
      return null;
    });

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem("redirectAfterLogin")).toBe(null);
    });
  });

  it("returnUrl이 /auth로 시작하면 저장하지 않음", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === "returnUrl") return "/auth/callback";
      return null;
    });

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem("redirectAfterLogin")).toBe(null);
    });
  });

  it("이미 인증되었으면 저장된 URL로 리다이렉트", async () => {
    localStorage.setItem("redirectAfterLogin", "/dashboard/notes");

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: "1", email: "test@example.com" } as any,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard/notes");
    });
  });

  it("이미 인증되었고 저장된 URL이 없으면 /dashboard/main으로 리다이렉트", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: "1", email: "test@example.com" } as any,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard/main");
    });
  });

  it("리다이렉트 후 localStorage에서 URL 삭제", async () => {
    localStorage.setItem("redirectAfterLogin", "/dashboard/notes");

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: "1", email: "test@example.com" } as any,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    renderHook(() => useLoginForm(), { wrapper });

    await waitFor(() => {
      expect(localStorage.getItem("redirectAfterLogin")).toBe(null);
    });
  });

  it("로딩 중에는 리다이렉트하지 않음", async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: true,
      user: { id: "1", email: "test@example.com" } as any,
      refetch: vi.fn(),
    });
    mockSearchParamsGet.mockReturnValue(null);

    renderHook(() => useLoginForm(), { wrapper });

    // 약간의 지연 후에도 리다이렉트가 호출되지 않아야 함
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

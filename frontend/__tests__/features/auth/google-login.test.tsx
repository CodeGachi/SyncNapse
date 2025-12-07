/**
 * useGoogleLogin 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGoogleLogin } from "@/features/auth/google-login";
import { ReactNode } from "react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api/services/auth.api", () => ({ getGoogleLoginUrl: vi.fn() }));
vi.mock("@/lib/api/mutations/auth.mutations", () => ({
  useLogin: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useLogout: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock("@/lib/auth/token-manager", () => ({ clearTokens: vi.fn() }));
vi.mock("@/lib/utils/cookie", () => ({ getCookie: vi.fn(), setCookie: vi.fn(), deleteCookie: vi.fn() }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => { vi.clearAllMocks(); queryClient.clear(); });

describe("useGoogleLogin", () => {
  it("handleLogin 함수 반환", () => {
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    expect(typeof result.current.handleLogin).toBe("function");
  });

  it("isLoading 초기값 false", () => {
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});

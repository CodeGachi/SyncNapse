import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGoogleLogin } from "@/features/auth/google-login";
import { ReactNode } from "react";

vi.mock("@/lib/api/services/auth.api", () => ({ getGoogleLoginUrl: vi.fn() }));
vi.mock("@/lib/api/mutations/auth.mutations", () => ({
  useLogin: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null })),
  useLogout: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null })),
}));
vi.mock("@/lib/auth/token-manager", () => ({ clearTokens: vi.fn() }));
vi.mock("@/lib/utils/cookie", () => ({ getCookie: vi.fn(), setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock("@/lib/mock/auth.mock", () => ({ mockGoogleLogin: vi.fn(), mockLogout: vi.fn() }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => { vi.clearAllMocks(); queryClient.clear(); });

describe("useGoogleLogin", () => {
  it("handleGoogleLogin 함수 반환", () => {
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    expect(typeof result.current.handleGoogleLogin).toBe("function");
  });

  it("loading 초기값 false", () => {
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    expect(result.current.loading).toBe(false);
  });
});

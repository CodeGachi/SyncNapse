import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/lib/api/services/auth.api", () => ({ getGoogleLoginUrl: vi.fn() }));
vi.mock("@/lib/api/mutations/auth.mutations", () => ({
  useLogin: () => ({ mutate: vi.fn(), isPending: false }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/auth/token-manager", () => ({ clearTokens: vi.fn() }));
vi.mock("@/lib/utils/cookie", () => ({ getCookie: vi.fn(), setCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock("@/lib/mock/auth.mock", () => ({ mockGoogleLogin: vi.fn(), mockLogout: vi.fn() }));

import { useGoogleLogin } from "@/features/auth/google-login";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useGoogleLogin", () => {
  it("handleGoogleLogin 반환", () => {
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    expect(typeof result.current.handleGoogleLogin).toBe("function");
  });
});

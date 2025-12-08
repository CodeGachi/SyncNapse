import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/lib/api/services/auth.api", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/token-manager", () => ({ setAccessToken: vi.fn(), setRefreshToken: vi.fn() }));
vi.mock("@/lib/utils/cookie", () => ({ getCookie: vi.fn(), setCookie: vi.fn() }));

import { useOAuthCallback } from "@/features/auth/use-oauth-callback";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useOAuthCallback", () => {
  it("훅 호출 가능", () => {
    const { result } = renderHook(() => useOAuthCallback(), { wrapper });
    expect(result).toBeDefined();
  });
});

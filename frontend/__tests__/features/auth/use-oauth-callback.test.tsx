/**
 * useOAuthCallback 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOAuthCallback } from "@/features/auth/use-oauth-callback";
import { ReactNode } from "react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => ({ get: vi.fn() }) }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

beforeEach(() => { vi.clearAllMocks(); queryClient.clear(); });

describe("useOAuthCallback", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useOAuthCallback(), { wrapper });
    expect(result.current.isProcessing).toBe(true);
  });
});

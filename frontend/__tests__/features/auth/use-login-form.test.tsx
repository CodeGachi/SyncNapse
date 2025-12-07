/**
 * useLoginForm 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLoginForm } from "@/features/auth/use-login-form";
import { ReactNode } from "react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

beforeEach(() => { vi.clearAllMocks(); queryClient.clear(); });

describe("useLoginForm", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useLoginForm(), { wrapper });
    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
  });

  it("setEmail로 이메일 설정", () => {
    const { result } = renderHook(() => useLoginForm(), { wrapper });
    act(() => { result.current.setEmail("test@test.com"); });
    expect(result.current.email).toBe("test@test.com");
  });
});

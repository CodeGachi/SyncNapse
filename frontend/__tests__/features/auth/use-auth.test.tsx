/**
 * useAuth 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/use-auth";
import * as authQueries from "@/lib/api/queries/auth.queries";
import { ReactNode } from "react";

// Mock useCurrentUser
vi.mock("@/lib/api/queries/auth.queries", () => ({
  useCurrentUser: vi.fn(),
}));

describe("useAuth", () => {
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
  });

  it("로딩 중일 때 loading이 true이고 user는 null", () => {
    vi.mocked(authQueries.useCurrentUser).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("인증된 사용자가 있으면 isAuthenticated가 true", () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
    };

    vi.mocked(authQueries.useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("에러가 발생하면 isAuthenticated가 false", () => {
    vi.mocked(authQueries.useCurrentUser).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("user가 있어도 isError가 true면 isAuthenticated가 false", () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
    };

    vi.mocked(authQueries.useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("refetch 함수가 반환됨", () => {
    const mockRefetch = vi.fn();

    vi.mocked(authQueries.useCurrentUser).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.refetch).toBe(mockRefetch);
  });
});

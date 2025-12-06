/**
 * use-auth 테스트
 * 인증 상태 관리 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/use-auth";

// Mock useCurrentUser
vi.mock("@/lib/api/queries/auth.queries", () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from "@/lib/api/queries/auth.queries";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("로딩 상태", () => {
    it("로딩 중일 때 loading: true", () => {
      (useCurrentUser as any).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("인증된 사용자", () => {
    it("사용자 정보가 있으면 isAuthenticated: true", () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      };

      (useCurrentUser as any).mockReturnValue({
        data: mockUser,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("refetch 함수 제공", () => {
      const mockRefetch = vi.fn();
      (useCurrentUser as any).mockReturnValue({
        data: { id: "user-1" },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.refetch).toBe(mockRefetch);
    });
  });

  describe("인증 실패", () => {
    it("에러 발생 시 isAuthenticated: false", () => {
      (useCurrentUser as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("사용자 데이터가 있어도 에러면 isAuthenticated: false", () => {
      (useCurrentUser as any).mockReturnValue({
        data: { id: "user-1" },
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("비인증 상태", () => {
    it("데이터 없고 에러 없으면 isAuthenticated: false", () => {
      (useCurrentUser as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});

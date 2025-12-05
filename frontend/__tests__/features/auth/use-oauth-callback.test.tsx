/**
 * useOAuthCallback 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOAuthCallback } from "@/features/auth/use-oauth-callback";
import * as authApi from "@/lib/api/services/auth.api";
import * as tokenManager from "@/lib/auth/token-manager";
import * as cookieUtils from "@/lib/utils/cookie";
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

// Mock auth API
vi.mock("@/lib/api/services/auth.api", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock token manager
vi.mock("@/lib/auth/token-manager", () => ({
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

// Mock cookie utils
vi.mock("@/lib/utils/cookie", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe("useOAuthCallback", () => {
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

  describe("에러 처리", () => {
    it("error 파라미터가 있으면 alert 표시하고 홈으로 리다이렉트", async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "error") return "access_denied";
        return null;
      });

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("로그인에 실패했습니다.");
        expect(mockRouterReplace).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("토큰 처리", () => {
    it("토큰이 없으면 홈으로 리다이렉트", async () => {
      mockSearchParamsGet.mockReturnValue(null);

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/");
      });
    });

    it("accessToken만 있고 refreshToken이 없으면 홈으로 리다이렉트", async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        return null;
      });

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/");
      });
    });

    it("토큰이 있으면 저장하고 사용자 정보 조회", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };

      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(cookieUtils.getCookie).mockReturnValue(null);

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(tokenManager.setAccessToken).toHaveBeenCalledWith("access-token");
        expect(tokenManager.setRefreshToken).toHaveBeenCalledWith("refresh-token");
        expect(authApi.getCurrentUser).toHaveBeenCalled();
      });
    });

    it("사용자 정보 조회 후 캐시에 저장", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };

      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(cookieUtils.getCookie).mockReturnValue(null);

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        const cachedUser = queryClient.getQueryData(["auth", "currentUser"]);
        expect(cachedUser).toEqual(mockUser);
      });
    });
  });

  describe("리다이렉트", () => {
    it("저장된 redirectAfterLogin 쿠키가 있으면 해당 URL로 리다이렉트", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };

      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(cookieUtils.getCookie).mockReturnValue("/dashboard/notes");

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard/notes");
      });
    });

    it("리다이렉트 후 쿠키 삭제", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };

      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(cookieUtils.getCookie).mockReturnValue("/dashboard/notes");

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(cookieUtils.setCookie).toHaveBeenCalledWith("redirectAfterLogin", "", 0);
      });
    });

    it("저장된 URL이 없으면 /dashboard/main으로 리다이렉트", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };

      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser as any);
      vi.mocked(cookieUtils.getCookie).mockReturnValue(null);

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard/main");
      });
    });
  });

  describe("에러 핸들링", () => {
    it("사용자 정보 조회 실패시 alert 표시하고 홈으로 리다이렉트", async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });

      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Failed"));

      renderHook(() => useOAuthCallback(), { wrapper });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("사용자 정보를 가져오는데 실패했습니다.");
        expect(mockRouterReplace).toHaveBeenCalledWith("/");
      });
    });
  });
});

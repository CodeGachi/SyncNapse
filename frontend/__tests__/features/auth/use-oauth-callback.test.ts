/**
 * use-oauth-callback 테스트
 * OAuth 콜백 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOAuthCallback } from "@/features/auth/use-oauth-callback";

// Mock dependencies
const mockReplace = vi.fn();
const mockGet = vi.fn();
const mockSetQueryData = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

vi.mock("@/lib/api/services/auth.api", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/token-manager", () => ({
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock("@/lib/utils/cookie", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

import { getCurrentUser } from "@/lib/api/services/auth.api";
import { setAccessToken, setRefreshToken } from "@/lib/auth/token-manager";
import { getCookie, setCookie } from "@/lib/utils/cookie";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  // Mock setQueryData
  queryClient.setQueryData = mockSetQueryData;

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useOAuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
    (getCookie as any).mockReturnValue(null);
  });

  describe("성공적인 OAuth 콜백", () => {
    it("토큰 저장 및 사용자 정보 조회", async () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token-123";
        if (key === "refreshToken") return "refresh-token-456";
        return null;
      });

      const mockUser = { id: "user-1", email: "test@example.com" };
      (getCurrentUser as any).mockResolvedValue(mockUser);

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(setAccessToken).toHaveBeenCalledWith("access-token-123");
        expect(setRefreshToken).toHaveBeenCalledWith("refresh-token-456");
        expect(getCurrentUser).toHaveBeenCalled();
        expect(mockSetQueryData).toHaveBeenCalledWith(
          ["auth", "currentUser"],
          mockUser
        );
      });
    });

    it("저장된 리다이렉트 URL로 이동", async () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });
      (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
      (getCookie as any).mockReturnValue("/note/123");

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/note/123");
        expect(setCookie).toHaveBeenCalledWith("redirectAfterLogin", "", 0);
      });
    });

    it("저장된 URL 없으면 대시보드로 이동", async () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });
      (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
      (getCookie as any).mockReturnValue(null);

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/main");
      });
    });
  });

  describe("에러 처리", () => {
    it("error 파라미터가 있으면 홈으로 리다이렉트", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockGet.mockImplementation((key: string) => {
        if (key === "error") return "access_denied";
        return null;
      });

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("로그인에 실패했습니다.");
        expect(mockReplace).toHaveBeenCalledWith("/");
      });

      alertSpy.mockRestore();
    });

    it("토큰이 없으면 홈으로 리다이렉트", async () => {
      mockGet.mockReturnValue(null);

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/");
      });
    });

    it("사용자 정보 조회 실패 시 홈으로 리다이렉트", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        if (key === "refreshToken") return "refresh-token";
        return null;
      });
      (getCurrentUser as any).mockRejectedValue(new Error("Failed"));

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "사용자 정보를 가져오는데 실패했습니다."
        );
        expect(mockReplace).toHaveBeenCalledWith("/");
      });

      alertSpy.mockRestore();
    });
  });

  describe("accessToken만 있는 경우", () => {
    it("refreshToken 없으면 홈으로 리다이렉트", async () => {
      mockGet.mockImplementation((key: string) => {
        if (key === "accessToken") return "access-token";
        return null;
      });

      renderHook(() => useOAuthCallback(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/");
      });
    });
  });
});

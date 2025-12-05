/**
 * useGoogleLogin 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGoogleLogin } from "@/features/auth/google-login";
import * as authApi from "@/lib/api/services/auth.api";
import * as authMutations from "@/lib/api/mutations/auth.mutations";
import * as tokenManager from "@/lib/auth/token-manager";
import * as cookieUtils from "@/lib/utils/cookie";
import { ReactNode } from "react";

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

// Mock auth API
vi.mock("@/lib/api/services/auth.api", () => ({
  getGoogleLoginUrl: vi.fn(),
}));

// Mock auth mutations
vi.mock("@/lib/api/mutations/auth.mutations", () => ({
  useLogin: vi.fn(),
  useLogout: vi.fn(),
}));

// Mock token manager
vi.mock("@/lib/auth/token-manager", () => ({
  clearTokens: vi.fn(),
}));

// Mock cookie utils
vi.mock("@/lib/utils/cookie", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

// Mock window.location
const originalLocation = window.location;

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe("useGoogleLogin", () => {
  let queryClient: QueryClient;
  let loginMutateFn: ReturnType<typeof vi.fn>;
  let logoutMutateFn: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    loginMutateFn = vi.fn();
    logoutMutateFn = vi.fn();

    vi.mocked(authMutations.useLogin).mockReturnValue({
      mutate: loginMutateFn,
      isPending: false,
      error: null,
    } as any);

    vi.mocked(authMutations.useLogout).mockReturnValue({
      mutate: logoutMutateFn,
      isPending: false,
      error: null,
    } as any);

    vi.clearAllMocks();

    // Reset window.location mock
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: "",
      pathname: "/",
      search: "",
      hash: "",
    } as any;
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  describe("초기 상태", () => {
    it("loading이 false로 시작", () => {
      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("mutation이 pending이면 loading이 true", () => {
      vi.mocked(authMutations.useLogin).mockReturnValue({
        mutate: loginMutateFn,
        isPending: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      expect(result.current.loading).toBe(true);
    });

    it("mutation에 에러가 있으면 error 반환", () => {
      vi.mocked(authMutations.useLogin).mockReturnValue({
        mutate: loginMutateFn,
        isPending: false,
        error: { message: "Login failed" },
      } as any);

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      expect(result.current.error).toBe("Login failed");
    });
  });

  describe("handleGoogleLogin", () => {
    it("Google OAuth URL을 가져와서 리다이렉트", async () => {
      vi.mocked(authApi.getGoogleLoginUrl).mockResolvedValue(
        "https://accounts.google.com/oauth/authorize?client_id=xxx"
      );
      vi.mocked(cookieUtils.getCookie).mockReturnValue(null);

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin();
      });

      expect(authApi.getGoogleLoginUrl).toHaveBeenCalled();
      expect(window.location.href).toBe(
        "https://accounts.google.com/oauth/authorize?client_id=xxx"
      );
    });

    it("현재 경로가 /가 아니면 리다이렉트 URL 저장", async () => {
      window.location.pathname = "/dashboard/notes";
      window.location.search = "?filter=recent";
      window.location.hash = "";

      vi.mocked(authApi.getGoogleLoginUrl).mockResolvedValue(
        "https://accounts.google.com/oauth"
      );

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin();
      });

      expect(cookieUtils.setCookie).toHaveBeenCalledWith(
        "redirectAfterLogin",
        "/dashboard/notes?filter=recent",
        60 * 60
      );
    });

    it("현재 경로가 /면 리다이렉트 URL 저장하지 않음", async () => {
      window.location.pathname = "/";
      window.location.search = "";
      window.location.hash = "";

      vi.mocked(authApi.getGoogleLoginUrl).mockResolvedValue(
        "https://accounts.google.com/oauth"
      );

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin();
      });

      expect(cookieUtils.setCookie).not.toHaveBeenCalled();
    });

    it("현재 경로가 /login이면 리다이렉트 URL 저장하지 않음", async () => {
      window.location.pathname = "/login";

      vi.mocked(authApi.getGoogleLoginUrl).mockResolvedValue(
        "https://accounts.google.com/oauth"
      );

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin();
      });

      expect(cookieUtils.setCookie).not.toHaveBeenCalled();
    });

    it("현재 경로가 /auth로 시작하면 리다이렉트 URL 저장하지 않음", async () => {
      window.location.pathname = "/auth/callback";

      vi.mocked(authApi.getGoogleLoginUrl).mockResolvedValue(
        "https://accounts.google.com/oauth"
      );

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin();
      });

      expect(cookieUtils.setCookie).not.toHaveBeenCalled();
    });

    it("에러 발생시 alert 표시", async () => {
      vi.mocked(authApi.getGoogleLoginUrl).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleGoogleLogin();
      });

      expect(mockAlert).toHaveBeenCalledWith("Network error");
    });
  });

  describe("handleCodeExchange", () => {
    it("code와 state를 사용해 login mutation 호출", () => {
      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      act(() => {
        result.current.handleCodeExchange("auth-code", "state-value");
      });

      expect(loginMutateFn).toHaveBeenCalledWith({
        code: "auth-code",
        state: "state-value",
      });
    });
  });

  describe("handleLogout", () => {
    it("토큰 정리 후 로그아웃 mutation 호출", async () => {
      const { result } = renderHook(() => useGoogleLogin(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(cookieUtils.deleteCookie).toHaveBeenCalledWith("redirectAfterLogin");
      expect(logoutMutateFn).toHaveBeenCalled();
    });
  });

  describe("로그인 성공 콜백", () => {
    it("로그인 성공시 저장된 URL로 리다이렉트", () => {
      let onSuccessCallback: () => void;

      vi.mocked(authMutations.useLogin).mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
        return {
          mutate: loginMutateFn,
          isPending: false,
          error: null,
        } as any;
      });

      vi.mocked(cookieUtils.getCookie).mockReturnValue("/dashboard/notes");

      renderHook(() => useGoogleLogin(), { wrapper });

      // onSuccess 콜백 실행
      act(() => {
        onSuccessCallback();
      });

      expect(cookieUtils.deleteCookie).toHaveBeenCalledWith("redirectAfterLogin");
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/notes");
    });

    it("로그인 성공시 저장된 URL이 없으면 /dashboard/main으로 리다이렉트", () => {
      let onSuccessCallback: () => void;

      vi.mocked(authMutations.useLogin).mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
        return {
          mutate: loginMutateFn,
          isPending: false,
          error: null,
        } as any;
      });

      vi.mocked(cookieUtils.getCookie).mockReturnValue(null);

      renderHook(() => useGoogleLogin(), { wrapper });

      act(() => {
        onSuccessCallback();
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/main");
    });
  });

  describe("로그인 실패 콜백", () => {
    it("로그인 실패시 alert 표시", () => {
      let onErrorCallback: () => void;

      vi.mocked(authMutations.useLogin).mockImplementation((options: any) => {
        onErrorCallback = options.onError;
        return {
          mutate: loginMutateFn,
          isPending: false,
          error: null,
        } as any;
      });

      renderHook(() => useGoogleLogin(), { wrapper });

      act(() => {
        onErrorCallback();
      });

      expect(mockAlert).toHaveBeenCalledWith("로그인에 실패했습니다.");
    });
  });

  describe("로그아웃 성공 콜백", () => {
    it("로그아웃 성공시 쿼리 캐시 클리어하고 /login으로 리다이렉트", () => {
      let onSuccessCallback: () => void;

      vi.mocked(authMutations.useLogout).mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
        return {
          mutate: logoutMutateFn,
          isPending: false,
          error: null,
        } as any;
      });

      const clearSpy = vi.spyOn(queryClient, "clear");

      renderHook(() => useGoogleLogin(), { wrapper });

      act(() => {
        onSuccessCallback();
      });

      expect(clearSpy).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith("/login");
    });
  });
});

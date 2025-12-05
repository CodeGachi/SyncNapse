/**
 * useRestoreForm 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRestoreForm } from "@/features/auth/use-restore-form";
import * as authApi from "@/lib/api/services/auth.api";

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

// Mock auth API
vi.mock("@/lib/api/services/auth.api", () => ({
  restoreAccount: vi.fn(),
  permanentDeleteAccount: vi.fn(),
}));

describe("useRestoreForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 상태", () => {
    it("토큰이 없으면 hasToken이 false", () => {
      mockSearchParamsGet.mockReturnValue(null);

      const { result } = renderHook(() => useRestoreForm());

      expect(result.current.hasToken).toBe(false);
      expect(result.current.status).toBe("idle");
    });

    it("토큰이 있으면 hasToken이 true", () => {
      mockSearchParamsGet.mockReturnValue("valid-token");

      const { result } = renderHook(() => useRestoreForm());

      expect(result.current.hasToken).toBe(true);
    });

    it("초기 상태가 idle", () => {
      mockSearchParamsGet.mockReturnValue("valid-token");

      const { result } = renderHook(() => useRestoreForm());

      expect(result.current.status).toBe("idle");
      expect(result.current.errorMessage).toBe("");
      expect(result.current.showDeleteConfirm).toBe(false);
    });
  });

  describe("handleRestore", () => {
    it("토큰이 없으면 복구 시도하지 않음", async () => {
      mockSearchParamsGet.mockReturnValue(null);

      const { result } = renderHook(() => useRestoreForm());

      await act(async () => {
        await result.current.handleRestore();
      });

      expect(authApi.restoreAccount).not.toHaveBeenCalled();
    });

    it("복구 성공시 success 상태로 변경되고 로그인 페이지로 리다이렉트", async () => {
      mockSearchParamsGet.mockReturnValue("valid-token");
      vi.mocked(authApi.restoreAccount).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRestoreForm());

      await act(async () => {
        await result.current.handleRestore();
      });

      expect(authApi.restoreAccount).toHaveBeenCalledWith("valid-token");
      expect(result.current.status).toBe("success");

      // 2초 후 리다이렉트
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/login?restored=true");
    });

    it("복구 실패시 error 상태로 변경", async () => {
      mockSearchParamsGet.mockReturnValue("invalid-token");
      vi.mocked(authApi.restoreAccount).mockRejectedValue(new Error("Invalid token"));

      const { result } = renderHook(() => useRestoreForm());

      await act(async () => {
        await result.current.handleRestore();
      });

      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe(
        "계정 복구에 실패했습니다. 토큰이 만료되었거나 유효하지 않습니다."
      );
    });

    it("복구 중 loading 상태", async () => {
      mockSearchParamsGet.mockReturnValue("valid-token");

      let resolveRestore: () => void;
      vi.mocked(authApi.restoreAccount).mockImplementation(
        () => new Promise((resolve) => { resolveRestore = resolve; })
      );

      const { result } = renderHook(() => useRestoreForm());

      // 복구 시작
      let restorePromise: Promise<void>;
      act(() => {
        restorePromise = result.current.handleRestore();
      });

      // loading 상태 확인
      expect(result.current.status).toBe("loading");

      // 복구 완료
      await act(async () => {
        resolveRestore!();
        await restorePromise;
      });

      expect(result.current.status).toBe("success");
    });
  });

  describe("handleDelete", () => {
    it("토큰이 없으면 삭제 시도하지 않음", async () => {
      mockSearchParamsGet.mockReturnValue(null);

      const { result } = renderHook(() => useRestoreForm());

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(authApi.permanentDeleteAccount).not.toHaveBeenCalled();
    });

    it("삭제 성공시 로그인 페이지로 리다이렉트", async () => {
      mockSearchParamsGet.mockReturnValue("valid-token");
      vi.mocked(authApi.permanentDeleteAccount).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRestoreForm());

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(authApi.permanentDeleteAccount).toHaveBeenCalledWith("valid-token");
      expect(mockRouterPush).toHaveBeenCalledWith("/login");
    });

    it("삭제 실패시 error 상태로 변경되고 삭제 확인 모달 닫힘", async () => {
      mockSearchParamsGet.mockReturnValue("valid-token");
      vi.mocked(authApi.permanentDeleteAccount).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useRestoreForm());

      // 먼저 삭제 확인 모달 열기
      act(() => {
        result.current.openDeleteConfirm();
      });
      expect(result.current.showDeleteConfirm).toBe(true);

      // 삭제 시도
      await act(async () => {
        await result.current.handleDelete();
      });

      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("계정 삭제에 실패했습니다.");
      expect(result.current.showDeleteConfirm).toBe(false);
    });
  });

  describe("삭제 확인 모달", () => {
    it("openDeleteConfirm으로 모달 열기", () => {
      mockSearchParamsGet.mockReturnValue("valid-token");

      const { result } = renderHook(() => useRestoreForm());

      expect(result.current.showDeleteConfirm).toBe(false);

      act(() => {
        result.current.openDeleteConfirm();
      });

      expect(result.current.showDeleteConfirm).toBe(true);
    });

    it("closeDeleteConfirm으로 모달 닫기", () => {
      mockSearchParamsGet.mockReturnValue("valid-token");

      const { result } = renderHook(() => useRestoreForm());

      act(() => {
        result.current.openDeleteConfirm();
      });
      expect(result.current.showDeleteConfirm).toBe(true);

      act(() => {
        result.current.closeDeleteConfirm();
      });
      expect(result.current.showDeleteConfirm).toBe(false);
    });
  });
});

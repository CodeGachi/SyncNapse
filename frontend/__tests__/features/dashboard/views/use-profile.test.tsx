/**
 * useProfile 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfile } from "@/features/dashboard/views/use-profile";
import * as useAuthModule from "@/features/auth/use-auth";
import * as authApi from "@/lib/api/services/auth.api";
import { ReactNode } from "react";

// Mock next/navigation
const mockRouterBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock next-themes
const mockSetTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
  }),
}));

// Mock useAuth
vi.mock("@/features/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

// Mock auth API
vi.mock("@/lib/api/services/auth.api", () => ({
  updateUserProfile: vi.fn(),
  deleteAccount: vi.fn(),
}));

describe("useProfile", () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      refetch: vi.fn(),
    } as any);

    vi.clearAllMocks();
  });

  describe("초기 상태", () => {
    it("사용자 정보 반환", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isEditing).toBe(false);
      expect(result.current.isSaving).toBe(false);
    });

    it("editName이 user.name으로 초기화", async () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.editName).toBe("Test User");
      });
    });
  });

  describe("handleBack", () => {
    it("router.back() 호출", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleBack();
      });

      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  describe("편집 모드", () => {
    it("startEditing으로 편집 모드 시작", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      expect(result.current.isEditing).toBe(false);

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);
    });

    it("handleCancel로 편집 취소하고 원래 이름 복원", async () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      // 편집 시작
      act(() => {
        result.current.startEditing();
        result.current.setEditName("New Name");
      });

      expect(result.current.editName).toBe("New Name");

      // 취소
      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editName).toBe("Test User");
    });
  });

  describe("handleSave", () => {
    it("빈 이름이면 에러 모달 표시", async () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
        result.current.setEditName("   ");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.modal).toMatchObject({
        type: "error",
        title: "입력 오류",
      });
      expect(authApi.updateUserProfile).not.toHaveBeenCalled();
    });

    it("저장 성공시 API 호출하고 성공 모달 표시", async () => {
      vi.mocked(authApi.updateUserProfile).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
        result.current.setEditName("New Name");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(authApi.updateUserProfile).toHaveBeenCalledWith({
        displayName: "New Name",
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["auth", "currentUser"],
      });
      expect(result.current.modal).toMatchObject({
        type: "success",
        title: "저장 완료",
      });
      expect(result.current.isEditing).toBe(false);
    });

    it("저장 실패시 에러 모달 표시", async () => {
      vi.mocked(authApi.updateUserProfile).mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
        result.current.setEditName("New Name");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.modal).toMatchObject({
        type: "error",
        title: "저장 실패",
      });
    });

    it("저장 중 isSaving이 true", async () => {
      let resolveUpdate: () => void;
      vi.mocked(authApi.updateUserProfile).mockImplementation(
        () => new Promise((resolve) => { resolveUpdate = resolve; })
      );

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
        result.current.setEditName("New Name");
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.handleSave();
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        resolveUpdate!();
        await savePromise;
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe("handleImageChange", () => {
    it("준비 중 모달 표시", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleImageChange();
      });

      expect(result.current.modal).toMatchObject({
        type: "info",
        title: "준비 중",
        message: "프로필 이미지 변경 기능은 준비 중입니다.",
      });
    });
  });

  describe("handleNotificationSettings", () => {
    it("준비 중 모달 표시", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleNotificationSettings();
      });

      expect(result.current.modal).toMatchObject({
        type: "info",
        title: "준비 중",
        message: "알림 설정 기능은 준비 중입니다.",
      });
    });
  });

  describe("계정 삭제", () => {
    it("handleDeleteAccount로 삭제 모달 열기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      expect(result.current.isDeleteModalOpen).toBe(false);

      act(() => {
        result.current.handleDeleteAccount();
      });

      expect(result.current.isDeleteModalOpen).toBe(true);
    });

    it("closeDeleteModal로 삭제 모달 닫기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      expect(result.current.isDeleteModalOpen).toBe(true);

      act(() => {
        result.current.closeDeleteModal();
      });

      expect(result.current.isDeleteModalOpen).toBe(false);
    });

    it("handleConfirmDelete로 계정 삭제 성공", async () => {
      vi.mocked(authApi.deleteAccount).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      await act(async () => {
        await result.current.handleConfirmDelete();
      });

      expect(authApi.deleteAccount).toHaveBeenCalled();
      expect(result.current.isDeleteModalOpen).toBe(false);
      expect(result.current.modal).toMatchObject({
        type: "success",
        title: "계정 삭제 완료",
      });
    });

    it("handleConfirmDelete 실패시 에러 모달 표시", async () => {
      vi.mocked(authApi.deleteAccount).mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      await act(async () => {
        await result.current.handleConfirmDelete();
      });

      expect(result.current.isDeleteModalOpen).toBe(false);
      expect(result.current.modal).toMatchObject({
        type: "error",
        title: "삭제 실패",
      });
    });
  });

  describe("테마 토글", () => {
    it("dark에서 light로 토글", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });
  });

  describe("모달 관리", () => {
    it("closeModal로 모달 닫기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      // 모달 열기
      act(() => {
        result.current.handleImageChange();
      });

      expect(result.current.modal).not.toBe(null);

      // 모달 닫기
      act(() => {
        result.current.closeModal();
      });

      expect(result.current.modal).toBe(null);
    });
  });
});

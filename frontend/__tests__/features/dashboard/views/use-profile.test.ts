/**
 * use-profile 훅 테스트
 * 프로필 페이지 비즈니스 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProfile } from "@/features/dashboard/views/use-profile";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock router
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock useAuth
const mockUser = vi.fn(() => ({
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
}));

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => ({
    user: mockUser(),
  }),
}));

// Mock useTheme
const mockTheme = vi.fn(() => "light");
const mockSetTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme(),
    setTheme: mockSetTheme,
  }),
}));

// Mock APIs
const mockUpdateUserProfile = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock("@/lib/api/services/auth.api", () => ({
  updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
  deleteAccount: () => mockDeleteAccount(),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("useProfile", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockUser.mockReturnValue({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
    });
    mockTheme.mockReturnValue("light");
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      expect(result.current.user).toEqual({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
      });
      expect(result.current.isEditing).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.modal).toBeNull();
      expect(result.current.isDeleteModalOpen).toBe(false);
    });

    it("editName이 user.name으로 초기화", async () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => {
        expect(result.current.editName).toBe("Test User");
      });
    });
  });

  describe("편집 모드", () => {
    it("startEditing - 편집 모드 시작", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);
    });

    it("handleCancel - 편집 취소", async () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
      });

      act(() => {
        result.current.setEditName("New Name");
      });

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
      });

      act(() => {
        result.current.setEditName("");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.modal).toEqual({
        type: "error",
        title: "입력 오류",
        message: "이름을 입력해주세요.",
      });
    });

    it("저장 성공시 성공 모달 표시", async () => {
      mockUpdateUserProfile.mockResolvedValue({});

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
      });

      act(() => {
        result.current.setEditName("New Name");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        displayName: "New Name",
      });
      expect(result.current.modal?.type).toBe("success");
      expect(result.current.isEditing).toBe(false);
    });

    it("저장 실패시 에러 모달 표시", async () => {
      mockUpdateUserProfile.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.startEditing();
      });

      act(() => {
        result.current.setEditName("New Name");
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.modal?.type).toBe("error");
      expect(result.current.modal?.title).toBe("저장 실패");
    });
  });

  describe("handleBack", () => {
    it("뒤로가기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleBack();
      });

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe("handleImageChange", () => {
    it("준비 중 모달 표시", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleImageChange();
      });

      expect(result.current.modal?.type).toBe("info");
      expect(result.current.modal?.message).toContain("준비 중");
    });
  });

  describe("handleNotificationSettings", () => {
    it("준비 중 모달 표시", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleNotificationSettings();
      });

      expect(result.current.modal?.type).toBe("info");
      expect(result.current.modal?.message).toContain("준비 중");
    });
  });

  describe("계정 삭제", () => {
    it("handleDeleteAccount - 삭제 모달 열기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      expect(result.current.isDeleteModalOpen).toBe(true);
    });

    it("closeDeleteModal - 삭제 모달 닫기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      act(() => {
        result.current.closeDeleteModal();
      });

      expect(result.current.isDeleteModalOpen).toBe(false);
    });

    it("handleConfirmDelete - 계정 삭제 성공", async () => {
      mockDeleteAccount.mockResolvedValue({});

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      await act(async () => {
        await result.current.handleConfirmDelete();
      });

      expect(mockDeleteAccount).toHaveBeenCalled();
      expect(result.current.isDeleteModalOpen).toBe(false);
      expect(result.current.modal?.type).toBe("success");
    });

    it("handleConfirmDelete - 계정 삭제 실패", async () => {
      mockDeleteAccount.mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleDeleteAccount();
      });

      await act(async () => {
        await result.current.handleConfirmDelete();
      });

      expect(result.current.modal?.type).toBe("error");
      expect(result.current.modal?.title).toBe("삭제 실패");
    });
  });

  describe("테마 토글", () => {
    it("light에서 dark로 토글", () => {
      mockTheme.mockReturnValue("light");

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("dark에서 light로 토글", () => {
      mockTheme.mockReturnValue("dark");

      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });
  });

  describe("closeModal", () => {
    it("모달 닫기", () => {
      const { result } = renderHook(() => useProfile(), { wrapper });

      act(() => {
        result.current.handleImageChange(); // 모달 열기
      });

      expect(result.current.modal).not.toBeNull();

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.modal).toBeNull();
    });
  });
});

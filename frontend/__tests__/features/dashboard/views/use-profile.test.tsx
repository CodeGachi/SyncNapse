/**
 * useProfile 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfile } from "@/features/dashboard/views/use-profile";
import * as useAuthModule from "@/features/auth/use-auth";
import * as authApi from "@/lib/api/services/auth.api";
import { ReactNode } from "react";

const mockRouterBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockRouterBack, push: vi.fn(), replace: vi.fn() }),
}));

const mockSetTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: mockSetTheme }),
}));

vi.mock("@/features/auth/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/api/services/auth.api", () => ({
  updateUserProfile: vi.fn(),
  deleteAccount: vi.fn(),
}));

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockUser = { id: "user-1", email: "test@example.com", name: "Test User" };

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

beforeEach(() => {
  queryClient.clear();
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: mockUser,
    loading: false,
    isAuthenticated: true,
    refetch: vi.fn(),
  } as any);
  vi.clearAllMocks();
});

describe("useProfile", () => {
  it("초기 상태 및 네비게이션", async () => {
    const { result } = renderHook(() => useProfile(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isEditing).toBe(false);
    await waitFor(() => expect(result.current.editName).toBe("Test User"));

    act(() => result.current.handleBack());
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it("편집 모드 및 저장", async () => {
    const { result } = renderHook(() => useProfile(), { wrapper });

    // 편집 시작/취소
    act(() => result.current.startEditing());
    expect(result.current.isEditing).toBe(true);

    act(() => {
      result.current.setEditName("New Name");
      result.current.handleCancel();
    });
    expect(result.current.isEditing).toBe(false);
    expect(result.current.editName).toBe("Test User");

    // 빈 이름 에러
    act(() => {
      result.current.startEditing();
      result.current.setEditName("   ");
    });
    await act(async () => await result.current.handleSave());
    expect(result.current.modal?.type).toBe("error");
    expect(authApi.updateUserProfile).not.toHaveBeenCalled();

    // 저장 성공
    vi.mocked(authApi.updateUserProfile).mockResolvedValue(undefined);
    act(() => result.current.setEditName("New Name"));
    await act(async () => await result.current.handleSave());
    expect(authApi.updateUserProfile).toHaveBeenCalledWith({ displayName: "New Name" });
    expect(result.current.modal?.type).toBe("success");

    // 저장 실패
    vi.mocked(authApi.updateUserProfile).mockRejectedValue(new Error("Failed"));
    act(() => {
      result.current.startEditing();
      result.current.setEditName("Another Name");
    });
    await act(async () => await result.current.handleSave());
    expect(result.current.modal?.type).toBe("error");
  });

  it("계정 삭제", async () => {
    const { result } = renderHook(() => useProfile(), { wrapper });

    // 모달 열기/닫기
    act(() => result.current.handleDeleteAccount());
    expect(result.current.isDeleteModalOpen).toBe(true);
    act(() => result.current.closeDeleteModal());
    expect(result.current.isDeleteModalOpen).toBe(false);

    // 삭제 성공
    vi.mocked(authApi.deleteAccount).mockResolvedValue(undefined);
    act(() => result.current.handleDeleteAccount());
    await act(async () => await result.current.handleConfirmDelete());
    expect(authApi.deleteAccount).toHaveBeenCalled();
    expect(result.current.modal?.type).toBe("success");

    // 삭제 실패
    vi.mocked(authApi.deleteAccount).mockRejectedValue(new Error("Failed"));
    act(() => result.current.handleDeleteAccount());
    await act(async () => await result.current.handleConfirmDelete());
    expect(result.current.modal?.type).toBe("error");
  });

  it("테마 토글 및 준비 중 기능", () => {
    const { result } = renderHook(() => useProfile(), { wrapper });

    act(() => result.current.toggleTheme());
    expect(mockSetTheme).toHaveBeenCalledWith("light");

    act(() => result.current.handleImageChange());
    expect(result.current.modal?.title).toBe("준비 중");

    act(() => result.current.handleNotificationSettings());
    expect(result.current.modal?.title).toBe("준비 중");
  });
});

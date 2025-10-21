/**
 * 인증 UI 상태 관리 Zustand Store
 *
 * NOTE: 서버 상태(user, loading, isAuthenticated)는 TanStack Query로 이동
 * 이 스토어는 오직 UI 관련 상태만 관리합니다.
 *
 * 사용자 정보는 useAuth() 훅을 통해 접근하세요:
 * import { useAuth } from "@/features/auth/use-auth";
 * const { user, loading, isAuthenticated } = useAuth();
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AuthUIState {
  // UI State
  isProfileDropdownOpen: boolean;
  showLoginPrompt: boolean;

  // Actions
  setProfileDropdownOpen: (open: boolean) => void;
  setShowLoginPrompt: (show: boolean) => void;
  toggleProfileDropdown: () => void;
}

export const useAuthStore = create<AuthUIState>()(
  devtools(
    (set) => ({
      // Initial State
      isProfileDropdownOpen: false,
      showLoginPrompt: false,

      // Actions
      setProfileDropdownOpen: (open) =>
        set({ isProfileDropdownOpen: open }),

      setShowLoginPrompt: (show) =>
        set({ showLoginPrompt: show }),

      toggleProfileDropdown: () =>
        set((state) => ({ isProfileDropdownOpen: !state.isProfileDropdownOpen })),
    }),
    { name: "AuthUIStore" }
  )
);

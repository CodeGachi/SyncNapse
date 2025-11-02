/**
 * Authentication UI Status Management Zustand Store
 *
* NOTE: Server Status(user, load, isAuthenticated) TanStack Querywith * Store Only UI Related Statusonly Management합다. * * User Information useAuth() Hook through 근하요: * import { useAuth } from "@/features/auth/use-auth"; * const { user, loading, isAuthenticated } = useAuth(); */
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
    {
      name: "AuthUIStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "authUIStore",
    }
  )
);

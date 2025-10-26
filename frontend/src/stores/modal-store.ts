/**
 * Modal state management using Zustand Store
 * Centrally manages the open/close state of modals used throughout the app
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ModalState {
  isSettingsModalOpen: boolean;

  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  toggleSettingsModal: () => void;

}

export const useModalStore = create<ModalState>()(
  devtools(
    (set) => ({
      isSettingsModalOpen: false,

      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
      toggleSettingsModal: () =>
        set((state) => ({
          isSettingsModalOpen: !state.isSettingsModalOpen,
        })),
    }),
    {
      name: "ModalStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "modalStore",
    }
  )
);

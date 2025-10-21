/**
 * 대시보드 Zustand Store
 * 대시보드 UI 상태 관리
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface DashboardState {
  // State
  isModalOpen: boolean;

  // Actions
  setIsModalOpen: (isOpen: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      // Initial State
      isModalOpen: false,

      // Actions
      setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    { name: "DashboardStore" }
  )
);

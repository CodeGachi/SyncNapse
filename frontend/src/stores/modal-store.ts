/**
 * 모달 상태 관리 Zustand Store
 * 앱 전체에서 사용되는 모달들의 열림/닫힘 상태를 중앙에서 관리
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ModalState {
  // 노트 생성 모달 상태
  isNoteSettingsModalOpen: boolean;

  // Actions
  openNoteSettingsModal: () => void;
  closeNoteSettingsModal: () => void;
  toggleNoteSettingsModal: () => void;

  // 향후 추가될 다른 모달들을 위한 확장 가능한 구조
  // isDeleteConfirmModalOpen: boolean;
  // openDeleteConfirmModal: () => void;
  // closeDeleteConfirmModal: () => void;
}

export const useModalStore = create<ModalState>()(
  devtools(
    (set) => ({
      // Initial State
      isNoteSettingsModalOpen: false,

      // Actions
      openNoteSettingsModal: () => set({ isNoteSettingsModalOpen: true }),
      closeNoteSettingsModal: () => set({ isNoteSettingsModalOpen: false }),
      toggleNoteSettingsModal: () =>
        set((state) => ({
          isNoteSettingsModalOpen: !state.isNoteSettingsModalOpen,
        })),
    }),
    { name: "ModalStore" }
  )
);

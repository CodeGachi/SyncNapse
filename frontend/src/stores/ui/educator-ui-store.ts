/**
 * Educator UI Store
 * 교육자 노트 전용 UI 상태 관리 (공유 모달 등)
 */

import { create } from "zustand";

interface EducatorUIState {
  // 공유 설정 모달
  isSharingModalOpen: boolean;
  sharingModalNoteId: string | null;
  sharingModalNoteTitle: string | null;

  // Actions
  openSharingModal: (noteId: string, noteTitle: string) => void;
  closeSharingModal: () => void;
}

export const useEducatorUIStore = create<EducatorUIState>((set) => ({
  // Initial state
  isSharingModalOpen: false,
  sharingModalNoteId: null,
  sharingModalNoteTitle: null,

  // Actions
  openSharingModal: (noteId: string, noteTitle: string) =>
    set({
      isSharingModalOpen: true,
      sharingModalNoteId: noteId,
      sharingModalNoteTitle: noteTitle,
    }),

  closeSharingModal: () =>
    set({
      isSharingModalOpen: false,
      sharingModalNoteId: null,
      sharingModalNoteTitle: null,
    }),
}));

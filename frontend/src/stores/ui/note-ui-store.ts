/**
 * Note UI Store - UI 상태만 관리
 * 데이터는 React Query가 관리하므로 여기서는 UI 상태만 포함
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface NoteUIState {
  // ===== PDF Viewer UI =====
  currentPage: number;

  // ===== File Tab UI =====
  openedTabs: string[]; // 탭에 열린 파일 ID 목록
  selectedFileId: string | null;
  activeTab: number;

  // ===== Panel UI =====
  isExpanded: boolean; // 오른쪽 패널 확장 상태
  activeCategories: string[]; // 활성화된 카테고리들

  // ===== Player UI =====
  isPlaying: boolean;
  currentTime: number;
  currentRecordingId: string | null;

  // ===== Question UI =====
  isQuestionModalOpen: boolean;
  isQuestionListExpanded: boolean;

  // ===== Page Actions =====
  setCurrentPage: (page: number) => void;

  // ===== Tab Actions =====
  openFileInTab: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  setActiveTab: (index: number) => void;
  selectFile: (id: string) => void;
  setSelectedFileId: (id: string | null) => void;

  // ===== Panel Actions =====
  toggleExpand: () => void;
  toggleCategory: (category: string) => void;

  // ===== Player Actions =====
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  selectRecording: (id: string) => void;

  // ===== Question Actions =====
  toggleQuestionModal: () => void;
  toggleQuestionListExpanded: () => void;

  // ===== Reset =====
  reset: () => void;
}

const initialState = {
  // PDF Viewer
  currentPage: 1,

  // File Tabs
  openedTabs: [],
  selectedFileId: null,
  activeTab: 0,

  // Panel
  isExpanded: false,
  activeCategories: ["Notes"],

  // Player
  isPlaying: false,
  currentTime: 0,
  currentRecordingId: null,

  // Question
  isQuestionModalOpen: false,
  isQuestionListExpanded: false,
};

export const useNoteUIStore = create<NoteUIState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ===== Page Actions =====
      setCurrentPage: (page) => set({ currentPage: page }),

      // ===== Tab Actions =====
      openFileInTab: (fileId) =>
        set((state) => {
          // 이미 열려있으면 해당 탭으로 이동
          if (state.openedTabs.includes(fileId)) {
            const tabIndex = state.openedTabs.indexOf(fileId);
            return {
              activeTab: tabIndex,
              selectedFileId: fileId,
            };
          }

          // 새 탭 추가
          const newOpenedTabs = [...state.openedTabs, fileId];
          return {
            openedTabs: newOpenedTabs,
            activeTab: newOpenedTabs.length - 1,
            selectedFileId: fileId,
          };
        }),

      closeTab: (fileId) =>
        set((state) => {
          const newOpenedTabs = state.openedTabs.filter((id) => id !== fileId);

          let newActiveTab = state.activeTab;
          let newSelectedId = state.selectedFileId;

          // 닫은 탭이 현재 선택된 탭이면 다른 탭 선택
          if (state.selectedFileId === fileId) {
            if (newOpenedTabs.length > 0) {
              const currentIndex = state.openedTabs.indexOf(fileId);
              const newIndex = currentIndex >= newOpenedTabs.length ? newOpenedTabs.length - 1 : currentIndex;
              newActiveTab = newIndex;
              newSelectedId = newOpenedTabs[newIndex];
            } else {
              newActiveTab = 0;
              newSelectedId = null;
            }
          } else {
            const closedIndex = state.openedTabs.indexOf(fileId);
            if (closedIndex < state.activeTab) {
              newActiveTab = state.activeTab - 1;
            }
          }

          return {
            openedTabs: newOpenedTabs,
            activeTab: newActiveTab,
            selectedFileId: newSelectedId,
          };
        }),

      setActiveTab: (index) => set({ activeTab: index }),

      selectFile: (id) => set({ selectedFileId: id }),

      setSelectedFileId: (id) => set({ selectedFileId: id }),

      // ===== Panel Actions =====
      toggleExpand: () => set((state) => ({ isExpanded: !state.isExpanded })),

      toggleCategory: (category) =>
        set((state) => ({
          activeCategories: state.activeCategories.includes(category)
            ? state.activeCategories.filter((c) => c !== category)
            : [...state.activeCategories, category],
        })),

      // ===== Player Actions =====
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      setCurrentTime: (time) => set({ currentTime: time }),

      selectRecording: (id) =>
        set({
          currentRecordingId: id,
          isPlaying: false,
          currentTime: 0,
        }),

      // ===== Question Actions =====
      toggleQuestionModal: () =>
        set((state) => ({
          isQuestionModalOpen: !state.isQuestionModalOpen,
        })),

      toggleQuestionListExpanded: () =>
        set((state) => ({
          isQuestionListExpanded: !state.isQuestionListExpanded,
        })),

      // ===== Reset =====
      reset: () => set(initialState),
    }),
    {
      name: "NoteUIStore",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);

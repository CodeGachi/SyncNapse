/**
 * Panel Status Management Store
 * File, etc, note, script Panel Open/Closed Status Management
*/

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface PanelsState {
  // Panel States
  isNotePanelOpen: boolean;
  isFilePanelOpen: boolean;
  isChatbotPanelOpen: boolean;
  isScriptOpen: boolean;
  isCollaborationPanelOpen: boolean;
  isDrawingSidebarOpen: boolean; // 필기바 표시 상태

  // Panel Actions
  toggleNotePanel: () => void;
  toggleFilePanel: () => void;
  toggleChatbotPanel: () => void;
  toggleScript: () => void;
  toggleCollaborationPanel: () => void;
  toggleDrawingSidebar: () => void; // 필기바 토글
  openScriptPanel: () => void; // 스크립트 패널 강제 열기

  // Reset
  reset: () => void;
}

const initialState = {
  isNotePanelOpen: false,
  isFilePanelOpen: false,
  isChatbotPanelOpen: false,
  isScriptOpen: false,
  isCollaborationPanelOpen: false,
  isDrawingSidebarOpen: false, // 필기바 기본 숨김
};

export const usePanelsStore = create<PanelsState>()(
  devtools(
    (set) => ({
      ...initialState,

      toggleNotePanel: () => set((state) => ({ isNotePanelOpen: !state.isNotePanelOpen })),

      toggleFilePanel: () =>
        set((state) => ({
          isFilePanelOpen: !state.isFilePanelOpen,
          isChatbotPanelOpen: false,
          isScriptOpen: false,
          isCollaborationPanelOpen: false,
        })),

      toggleChatbotPanel: () =>
        set((state) => ({
          isChatbotPanelOpen: !state.isChatbotPanelOpen,
          isFilePanelOpen: false,
          isScriptOpen: false,
          isCollaborationPanelOpen: false,
        })),

      toggleScript: () =>
        set((state) => ({
          isScriptOpen: !state.isScriptOpen,
          isFilePanelOpen: false,
          isChatbotPanelOpen: false,
          isCollaborationPanelOpen: false,
        })),

      toggleCollaborationPanel: () =>
        set((state) => ({
          isCollaborationPanelOpen: !state.isCollaborationPanelOpen,
          isFilePanelOpen: false,
          isChatbotPanelOpen: false,
          isScriptOpen: false,
        })),

      toggleDrawingSidebar: () =>
        set((state) => ({
          isDrawingSidebarOpen: !state.isDrawingSidebarOpen,
        })),

      // 스크립트 패널 강제 열기 (녹음본 클릭 시 사용)
      openScriptPanel: () =>
        set({
          isScriptOpen: true,
          isFilePanelOpen: false,
          isChatbotPanelOpen: false,
          isCollaborationPanelOpen: false,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "PanelsStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "panelsStore",
    }
  )
);

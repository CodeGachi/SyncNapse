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
  isEtcPanelOpen: boolean;
  isScriptOpen: boolean;
  isCollaborationPanelOpen: boolean;

  // Panel Actions
  toggleNotePanel: () => void;
  toggleFilePanel: () => void;
  toggleEtcPanel: () => void;
  toggleScript: () => void;
  toggleCollaborationPanel: () => void;
  openScriptPanel: () => void; // 스크립트 패널 강제 열기

  // Reset
  reset: () => void;
}

const initialState = {
  isNotePanelOpen: false,
  isFilePanelOpen: false,
  isEtcPanelOpen: false,
  isScriptOpen: false,
  isCollaborationPanelOpen: false,
};

export const usePanelsStore = create<PanelsState>()(
  devtools(
    (set) => ({
      ...initialState,

      toggleNotePanel: () => set((state) => ({ isNotePanelOpen: !state.isNotePanelOpen })),

      toggleFilePanel: () =>
        set((state) => ({
          isFilePanelOpen: !state.isFilePanelOpen,
          isEtcPanelOpen: false,
          isScriptOpen: false,
          isCollaborationPanelOpen: false,
        })),

      toggleEtcPanel: () =>
        set((state) => ({
          isEtcPanelOpen: !state.isEtcPanelOpen,
          isFilePanelOpen: false,
          isScriptOpen: false,
          isCollaborationPanelOpen: false,
        })),

      toggleScript: () =>
        set((state) => ({
          isScriptOpen: !state.isScriptOpen,
          isFilePanelOpen: false,
          isEtcPanelOpen: false,
          isCollaborationPanelOpen: false,
        })),

      toggleCollaborationPanel: () =>
        set((state) => ({
          isCollaborationPanelOpen: !state.isCollaborationPanelOpen,
          isFilePanelOpen: false,
          isEtcPanelOpen: false,
          isScriptOpen: false,
        })),

      // 스크립트 패널 강제 열기 (녹음본 클릭 시 사용)
      openScriptPanel: () =>
        set({
          isScriptOpen: true,
          isFilePanelOpen: false,
          isEtcPanelOpen: false,
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

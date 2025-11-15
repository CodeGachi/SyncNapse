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
        })),

      toggleEtcPanel: () =>
        set((state) => ({
          isEtcPanelOpen: !state.isEtcPanelOpen,
          isFilePanelOpen: false,
        })),

      toggleScript: () => set((state) => ({ isScriptOpen: !state.isScriptOpen })),

      toggleCollaborationPanel: () =>
        set((state) => ({
          isCollaborationPanelOpen: !state.isCollaborationPanelOpen,
          isFilePanelOpen: false,
          isEtcPanelOpen: false,
        })),

      reset: () => set(initialState),
    }),
    {
      name: "PanelsStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "panelsStore",
    }
  )
);

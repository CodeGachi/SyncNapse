/**
 * Panel Status Management Store
 * File, etc, tags, note, script Panel Open/Closed Status Management  
*/

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface PanelsState {
  // Panel States
  isNotePanelOpen: boolean;
  isFilePanelOpen: boolean;
  isEtcPanelOpen: boolean;
  isTagsPanelOpen: boolean;
  isScriptOpen: boolean;
  isCollaborationPanelOpen: boolean;

  // Panel Actions
  toggleNotePanel: () => void;
  toggleFilePanel: () => void;
  toggleEtcPanel: () => void;
  toggleTagsPanel: () => void;
  toggleScript: () => void;
  toggleCollaborationPanel: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isNotePanelOpen: false,
  isFilePanelOpen: false,
  isEtcPanelOpen: false,
  isTagsPanelOpen: false,
  isScriptOpen: false,
  isCollaborationPanelOpen: false,
};

export const usePanelsStore = create<PanelsState>()(
  devtools(
    (set) => ({
      ...initialState,

      toggleNotePanel: () => set((state) => ({ isNotePanelOpen: !state.isNotePanelOpen })),      toggleFilePanel: () =>
        set((state) => ({
          isFilePanelOpen: !state.isFilePanelOpen,
          isEtcPanelOpen: false,
          isTagsPanelOpen: false,
        })),

      toggleEtcPanel: () =>
        set((state) => ({
          isEtcPanelOpen: !state.isEtcPanelOpen,
          isFilePanelOpen: false,
          isTagsPanelOpen: false,
        })),

      toggleTagsPanel: () =>
        set((state) => ({
          isTagsPanelOpen: !state.isTagsPanelOpen,
          isFilePanelOpen: false,
          isEtcPanelOpen: false,
        })),

      toggleScript: () => set((state) => ({ isScriptOpen: !state.isScriptOpen })),

      toggleCollaborationPanel: () =>
        set((state) => ({
          isCollaborationPanelOpen: !state.isCollaborationPanelOpen,
          isFilePanelOpen: false,
          isEtcPanelOpen: false,
          isTagsPanelOpen: false,
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

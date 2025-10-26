/**
 * 패널 상태 관리 Store
 * 파일, etc, tags, note, script 패널의 열림/닫힘 상태 관리
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

  // Panel Actions
  toggleNotePanel: () => void;
  toggleFilePanel: () => void;
  toggleEtcPanel: () => void;
  toggleTagsPanel: () => void;
  toggleScript: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isNotePanelOpen: false,
  isFilePanelOpen: false,
  isEtcPanelOpen: false,
  isTagsPanelOpen: false,
  isScriptOpen: false,
};

export const usePanelsStore = create<PanelsState>()(
  devtools(
    (set) => ({
      ...initialState,

      // 패널 토글 - files, etc, tags는 상호 배타적
      toggleNotePanel: () =>
        set((state) => ({ isNotePanelOpen: !state.isNotePanelOpen })),

      toggleFilePanel: () =>
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

      reset: () => set(initialState),
    }),
    {
      name: "PanelsStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "panelsStore",
    }
  )
);

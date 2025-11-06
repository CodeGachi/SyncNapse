/**
 * Drawing-Board 마이그레이션: Undo/Redo 상태 관리
 * Zustand 스토어 (drawing-board의 modules_tools.js 포팅)
 */

import { create } from 'zustand';

export interface ToolsState {
  // State
  snapshot: string;
  redoArr: string[];
  undoArr: string[];

  // Actions
  saveSnapshot: (snapshot: string) => void;
  pushUndo: () => void;
  pushRedo: () => void;
  undo: () => string | null;
  redo: () => string | null;
  clearUndo: () => void;
  clearRedo: () => void;
  reset: () => void;
  getCanUndo: () => boolean;
  getCanRedo: () => boolean;
}

export const useToolsStore = create<ToolsState>((set, get) => ({
  // Initial state
  snapshot: '',
  redoArr: [],
  undoArr: [],

  // Save current snapshot
  saveSnapshot: (snapshot: string) => set({ snapshot }),

  // Push current snapshot to undo stack
  pushUndo: () => {
    const { snapshot, undoArr } = get();
    if (snapshot) {
      set({ undoArr: [...undoArr, snapshot] });
    }
  },

  // Push current snapshot to redo stack
  pushRedo: () => {
    const { snapshot, redoArr } = get();
    set({ redoArr: [...redoArr, snapshot] });
  },

  // Pop from undo stack and return
  undo: () => {
    const { undoArr } = get();
    if (undoArr.length === 0) return null;

    const newUndoArr = [...undoArr];
    const snapshot = newUndoArr.pop();

    if (snapshot) {
      set({ undoArr: newUndoArr });
      return snapshot;
    }
    return null;
  },

  // Pop from redo stack and return
  redo: () => {
    const { redoArr } = get();
    if (redoArr.length === 0) return null;

    const newRedoArr = [...redoArr];
    const snapshot = newRedoArr.pop();

    if (snapshot) {
      set({ redoArr: newRedoArr });
      return snapshot;
    }
    return null;
  },

  // Clear undo stack
  clearUndo: () => set({ undoArr: [] }),

  // Clear redo stack
  clearRedo: () => set({ redoArr: [] }),

  // Reset all state
  reset: () =>
    set({
      snapshot: '',
      redoArr: [],
      undoArr: []
    }),

  // Check if can undo
  getCanUndo: () => get().undoArr.length > 0,

  // Check if can redo
  getCanRedo: () => get().redoArr.length > 0
}));

/**
 * Tools Store - 마이그레이션: drawing-board의 modules_tools.js 포팅
 * Undo/Redo 상태 관리 (Canvas JSON 스냅샷 스택)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ToolsState {
  // Canvas state snapshots for undo/redo
  snapshot: string;
  undoArr: string[];
  redoArr: string[];

  // Actions
  saveSnapshot: (snapshot: string) => void;
  pushUndo: (snapshot: string) => void;
  pushRedo: (snapshot: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearUndo: () => void;
  clearRedo: () => void;
  reset: () => void;
  getCanUndo: () => boolean;
  getCanRedo: () => boolean;
}

const initialState = {
  snapshot: "",
  undoArr: [] as string[],
  redoArr: [] as string[],
};

export const useToolsStore = create<ToolsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 현재 스냅샷 저장
      saveSnapshot: (snapshot: string) => {
        set((state) => ({
          snapshot,
          // 새 액션이 들어오면 redo 배열 초기화
          redoArr: [],
        }));
      },

      // Undo 스택에 추가
      pushUndo: (snapshot: string) => {
        set((state) => ({
          undoArr: [...state.undoArr, snapshot],
          redoArr: [],
        }));
      },

      // Redo 스택에 추가
      pushRedo: (snapshot: string) => {
        set((state) => ({
          redoArr: [...state.redoArr, snapshot],
        }));
      },

      // Undo 수행: 스택에서 팝하고 스냅샷 반환
      undo: () => {
        const state = get();
        if (state.undoArr.length === 0) return null;

        const newUndoArr = [...state.undoArr];
        const snapshot = newUndoArr.pop() || "";

        set({
          undoArr: newUndoArr,
          redoArr: [...state.redoArr, state.snapshot],
          snapshot,
        });

        return snapshot;
      },

      // Redo 수행: 스택에서 팝하고 스냅샷 반환
      redo: () => {
        const state = get();
        if (state.redoArr.length === 0) return null;

        const newRedoArr = [...state.redoArr];
        const snapshot = newRedoArr.pop() || "";

        set({
          redoArr: newRedoArr,
          undoArr: [...state.undoArr, state.snapshot],
          snapshot,
        });

        return snapshot;
      },

      // Undo 배열 초기화
      clearUndo: () => {
        set({ undoArr: [] });
      },

      // Redo 배열 초기화
      clearRedo: () => {
        set({ redoArr: [] });
      },

      // 전체 리셋
      reset: () => {
        set(initialState);
      },

      // Undo 가능 여부 확인
      getCanUndo: () => {
        return get().undoArr.length > 0;
      },

      // Redo 가능 여부 확인
      getCanRedo: () => {
        return get().redoArr.length > 0;
      },
    }),
    {
      name: "tools-store",
    }
  )
);

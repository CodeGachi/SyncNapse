/**
 * Drawing Store - 마이그레이션: drawing-board의 modules_draw.js 포팅
 * 필기 도구 상태 관리 (색상, 선굵기, 현재 도구, 마우스 위치)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type DrawToolType =
  | "hand"          // 선택 도구 (객체 선택)
  | "free"
  | "solidLine"
  | "dashedLine"
  | "arrowLine"
  | "rect"
  | "triangle"
  | "rightTriangle"
  | "circle"
  | "text"
  | "pen"
  | "highlighter"
  | "eraser";

interface DrawState {
  // Drawing tool state
  type: DrawToolType;
  toolsIndex: number;
  lineColor: string;
  lineWidth: number;

  // Mouse positions for shape drawing
  mouseFrom: { x: number; y: number };
  mouseTo: { x: number; y: number };

  // Actions
  setDrawType: (type: DrawToolType) => void;
  setLineColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setMouseFrom: (pos: { x: number; y: number }) => void;
  setMouseTo: (pos: { x: number; y: number }) => void;
  setMousePos: (from: { x: number; y: number }, to: { x: number; y: number }) => void;
  reset: () => void;
}

const initialState = {
  type: "pen" as DrawToolType,
  toolsIndex: 0,
  lineColor: "#000000",
  lineWidth: 2,
  mouseFrom: { x: 0, y: 0 },
  mouseTo: { x: 0, y: 0 },
};

export const useDrawStore = create<DrawState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Actions
      setDrawType: (type) => set({ type }),

      setLineColor: (color) => set({ lineColor: color }),

      setLineWidth: (width) => set({ lineWidth: width }),

      setMouseFrom: (pos) => set({ mouseFrom: pos }),

      setMouseTo: (pos) => set({ mouseTo: pos }),

      setMousePos: (from, to) => set({ mouseFrom: from, mouseTo: to }),

      reset: () => set(initialState),
    }),
    {
      name: "draw-store",
    }
  )
);

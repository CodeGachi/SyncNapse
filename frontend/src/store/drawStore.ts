/**
 * Drawing-Board 마이그레이션: 필기 도구 상태 관리
 * Zustand 스토어 (drawing-board의 modules_draw.js 포팅)
 */

import { create } from 'zustand';

export type DrawToolType =
  | 'free'           // 펜 (자유 드로잉)
  | 'highlighter'    // 형광펜
  | 'eraser'         // 지우개
  | 'solidLine'      // 직선
  | 'dashedLine'     // 점선
  | 'arrowLine'      // 화살표
  | 'rect'           // 사각형
  | 'triangle'       // 삼각형
  | 'rightTriangle'  // 직각삼각형
  | 'circle'         // 원
  | 'text'           // 텍스트
  | 'add'            // 추가 (페이지)
  | 'color'          // 색상 선택
  | 'shape'          // 도형 선택
  | 'picture'        // 이미지
  | 'background'     // 배경
  | 'setting'        // 설정
  | 'select';        // 선택 모드

export interface DrawState {
  // State
  type: DrawToolType;
  toolsIndex: number;
  lineColor: string;
  lineWidth: number;
  mouseFrom: { x: number; y: number };
  mouseTo: { x: number; y: number };

  // Actions
  setDrawType: (type: DrawToolType) => void;
  setToolsIndex: (index: number) => void;
  setLineColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setMouseFrom: (x: number, y: number) => void;
  setMouseTo: (x: number, y: number) => void;
  setMousePos: (from: { x: number; y: number }, to: { x: number; y: number }) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  type: 'free' as DrawToolType,
  toolsIndex: 1,
  lineColor: '#4D4D4D',
  lineWidth: 4,
  mouseFrom: { x: 0, y: 0 },
  mouseTo: { x: 0, y: 0 }
};

export const useDrawStore = create<DrawState>((set) => ({
  ...INITIAL_STATE,

  setDrawType: (type: DrawToolType) => set({ type }),

  setToolsIndex: (index: number) => set({ toolsIndex: index }),

  setLineColor: (color: string) => set({ lineColor: color }),

  setLineWidth: (width: number) => set({ lineWidth: width }),

  setMouseFrom: (x: number, y: number) =>
    set({ mouseFrom: { x, y } }),

  setMouseTo: (x: number, y: number) =>
    set({ mouseTo: { x, y } }),

  setMousePos: (from: { x: number; y: number }, to: { x: number; y: number }) =>
    set({ mouseFrom: from, mouseTo: to }),

  reset: () => set(INITIAL_STATE)
}));

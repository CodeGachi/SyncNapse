/**
 * Drawing-Board 마이그레이션: 도형 생성 유틸리티
 * 클릭 한 번으로 고정 크기 도형 생성
 */

import * as fabric from 'fabric';

export interface DrawInfo {
  lineColor: string;
  lineWidth: number;
  mouseFrom: { x: number; y: number };
  mouseTo: { x: number; y: number };
}

// 클릭 기반 도형 생성용 인터페이스
export interface ClickShapeInfo {
  x: number;
  y: number;
  lineColor: string;
  lineWidth: number;
}

// 고정 크기 설정
const DEFAULT_SIZES = {
  line: 100,
  arrow: 100,
  rect: { width: 120, height: 80 },
  circle: 50,
};

/**
 * 직선 생성 (클릭 기반 - 고정 길이)
 */
export const createSolidLineClick = (info: ClickShapeInfo): fabric.Line => {
  const { x, y, lineColor, lineWidth } = info;
  const length = DEFAULT_SIZES.line;

  return new fabric.Line(
    [x - length / 2, y, x + length / 2, y],
    {
      stroke: lineColor,
      strokeWidth: lineWidth,
      selectable: true,
      evented: true,
    }
  );
};

/**
 * 화살표 생성 (클릭 기반 - 고정 길이, 가로 방향)
 */
export const createArrowLineClick = (info: ClickShapeInfo): fabric.Group => {
  const { x, y, lineColor, lineWidth } = info;
  const length = DEFAULT_SIZES.arrow;
  const arrowSize = lineWidth * 5;

  const startX = x - length / 2;
  const endX = x + length / 2;

  const line = new fabric.Line(
    [startX, y, endX, y],
    {
      stroke: lineColor,
      strokeWidth: lineWidth,
      selectable: false,
      evented: false,
    }
  );

  // 화살표 끝부분 (삼각형) - 오른쪽 방향
  const arrowHead = new fabric.Triangle({
    left: endX,
    top: y,
    width: arrowSize,
    height: arrowSize,
    fill: lineColor,
    angle: 90, // 오른쪽 방향
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });

  return new fabric.Group([line, arrowHead], {
    selectable: true,
    evented: true,
  });
};

/**
 * 사각형 생성 (클릭 기반 - 고정 크기, 중심 기준)
 */
export const createRectClick = (info: ClickShapeInfo): fabric.Rect => {
  const { x, y, lineColor, lineWidth } = info;
  const { width, height } = DEFAULT_SIZES.rect;

  return new fabric.Rect({
    left: x,
    top: y,
    width,
    height,
    originX: 'center',
    originY: 'center',
    fill: 'rgba(255, 255, 255, 0)',
    stroke: lineColor,
    strokeWidth: lineWidth,
    selectable: true,
    evented: true,
  });
};

/**
 * 원 생성 (클릭 기반 - 고정 반지름, 중심 기준)
 */
export const createCircleClick = (info: ClickShapeInfo): fabric.Circle => {
  const { x, y, lineColor, lineWidth } = info;
  const radius = DEFAULT_SIZES.circle;

  return new fabric.Circle({
    left: x,
    top: y,
    radius,
    originX: 'center',
    originY: 'center',
    fill: 'rgba(255, 255, 255, 0)',
    stroke: lineColor,
    strokeWidth: lineWidth,
    selectable: true,
    evented: true,
  });
};

/**
 * 도형 타입 정의 (draw-store와 일치)
 */
export type ShapeType =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'hand'
  | 'solidLine'
  | 'arrowLine'
  | 'rect'
  | 'circle';

/**
 * 클릭 기반 도형 생성 함수 매핑
 */
const CLICK_SHAPE_CREATORS: Record<
  ShapeType,
  ((info: ClickShapeInfo) => fabric.Object) | null
> = {
  pen: null, // Fabric.js isDrawingMode로 처리
  highlighter: null, // Fabric.js isDrawingMode로 처리
  eraser: null, // 별도 처리
  hand: null, // 선택 모드
  solidLine: createSolidLineClick,
  arrowLine: createArrowLineClick,
  rect: createRectClick,
  circle: createCircleClick,
};

/**
 * 클릭으로 고정 크기 도형 생성
 */
export const createShapeByClick = (
  info: ClickShapeInfo,
  type: ShapeType
): fabric.Object | null => {
  try {
    const creator = CLICK_SHAPE_CREATORS[type];
    if (!creator) {
      console.warn(`Shape type ${type} does not support click creation`);
      return null;
    }

    return creator(info);
  } catch (error) {
    console.error(`Error creating shape ${type}:`, error);
    return null;
  }
};

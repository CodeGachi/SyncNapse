/**
 * Drawing-Board 마이그레이션: 도형 생성 유틸리티
 * drawing-board의 src/utils/shape.js 포팅
 */

import * as fabric from 'fabric';

export interface DrawInfo {
  lineColor: string;
  lineWidth: number;
  mouseFrom: { x: number; y: number };
  mouseTo: { x: number; y: number };
}

/**
 * 직선 생성
 */
export const createSolidLine = (info: DrawInfo): fabric.Line => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  return new fabric.Line(
    [mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y],
    {
      stroke: lineColor,
      strokeWidth: lineWidth,
      selectable: true,
      evented: true
    }
  );
};

/**
 * 점선 생성
 */
export const createDashedLine = (info: DrawInfo): fabric.Line => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  return new fabric.Line(
    [mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y],
    {
      stroke: lineColor,
      strokeWidth: lineWidth,
      strokeDashArray: [3, 5],
      selectable: true,
      evented: true
    }
  );
};

/**
 * 화살표 생성 (Path 사용)
 */
export const createArrowLine = (info: DrawInfo): fabric.Group => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  const dx = mouseTo.x - mouseFrom.x;
  const dy = mouseTo.y - mouseFrom.y;
  const angle = Math.atan2(dy, dx);
  const arrowSize = lineWidth * 5;

  const line = new fabric.Line(
    [mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y],
    {
      stroke: lineColor,
      strokeWidth: lineWidth,
      selectable: false,
      evented: false
    }
  );

  // 화살표 끝부분 (삼각형)
  const arrowHead = new fabric.Triangle({
    left: mouseTo.x,
    top: mouseTo.y,
    width: arrowSize,
    height: arrowSize,
    fill: lineColor,
    angle: (angle * 180) / Math.PI + 90,
    selectable: false,
    evented: false
  });

  return new fabric.Group([line, arrowHead], {
    selectable: true,
    evented: true
  });
};

/**
 * 사각형 생성
 */
export const createRect = (info: DrawInfo): fabric.Rect => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  const left = Math.min(mouseFrom.x, mouseTo.x);
  const top = Math.min(mouseFrom.y, mouseTo.y);
  const width = Math.abs(mouseTo.x - mouseFrom.x);
  const height = Math.abs(mouseTo.y - mouseFrom.y);

  return new fabric.Rect({
    left,
    top,
    width,
    height,
    fill: 'rgba(255, 255, 255, 0)',
    stroke: lineColor,
    strokeWidth: lineWidth,
    selectable: true,
    evented: true
  });
};

/**
 * 원 생성
 */
export const createCircle = (info: DrawInfo): fabric.Circle => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  const radius =
    Math.sqrt(
      (mouseTo.x - mouseFrom.x) ** 2 + (mouseTo.y - mouseFrom.y) ** 2
    ) / 2;

  return new fabric.Circle({
    left: mouseFrom.x,
    top: mouseFrom.y,
    radius,
    fill: 'rgba(255, 255, 255, 0)',
    stroke: lineColor,
    strokeWidth: lineWidth,
    selectable: true,
    evented: true
  });
};

/**
 * 삼각형 생성
 */
export const createTriangle = (info: DrawInfo): fabric.Triangle => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  const width = Math.abs(mouseTo.x - mouseFrom.x);
  const height = Math.abs(mouseTo.y - mouseFrom.y);

  return new fabric.Triangle({
    left: mouseFrom.x,
    top: mouseFrom.y,
    width,
    height,
    fill: 'rgba(255, 255, 255, 0)',
    stroke: lineColor,
    strokeWidth: lineWidth,
    selectable: true,
    evented: true
  });
};

/**
 * 직각삼각형 생성 (Path 사용)
 */
export const createRightTriangle = (info: DrawInfo): fabric.Path => {
  const { mouseFrom, mouseTo, lineColor, lineWidth } = info;

  const pathData = `M ${mouseFrom.x} ${mouseFrom.y} L ${mouseFrom.x} ${mouseTo.y} L ${mouseTo.x} ${mouseTo.y} z`;

  return new fabric.Path(pathData, {
    stroke: lineColor,
    strokeWidth: lineWidth,
    fill: 'rgba(255, 255, 255, 0)',
    selectable: true,
    evented: true
  });
};

/**
 * 텍스트 생성
 */
export const createText = (info: DrawInfo): fabric.Textbox => {
  const { mouseTo, lineColor } = info;

  return new fabric.Textbox('', {
    left: mouseTo.x,
    top: mouseTo.y,
    width: 150,
    height: 40,
    fontSize: 20,
    fill: lineColor,
    borderColor: '#2c2c2c',
    cursorColor: lineColor,
    selectable: true,
    evented: true
  });
};

/**
 * 도형 타입별 생성 함수 매핑
 */
type ShapeType =
  | 'free'
  | 'solidLine'
  | 'dashedLine'
  | 'arrowLine'
  | 'rect'
  | 'triangle'
  | 'rightTriangle'
  | 'circle'
  | 'text';

const SHAPE_CREATORS: Record<
  ShapeType,
  (info: DrawInfo) => fabric.Object
> = {
  free: () => {
    throw new Error('Free drawing is handled by Fabric.js isDrawingMode');
  },
  solidLine: createSolidLine,
  dashedLine: createDashedLine,
  arrowLine: createArrowLine,
  rect: createRect,
  triangle: createTriangle,
  rightTriangle: createRightTriangle,
  circle: createCircle,
  text: createText
};

/**
 * 메인 draw 함수: 타입에 따라 적절한 도형 생성
 */
export const drawShape = (
  info: DrawInfo,
  type: ShapeType
): fabric.Object | null => {
  try {
    const creator = SHAPE_CREATORS[type];
    if (!creator) {
      console.warn(`Unsupported shape type: ${type}`);
      return null;
    }

    return creator(info);
  } catch (error) {
    console.error(`Error creating shape ${type}:`, error);
    return null;
  }
};

/**
 * 도형의 치수 계산 (미리보기용)
 */
export const getShapeDimensions = (
  info: DrawInfo
): { width: number; height: number } => {
  const width = Math.abs(info.mouseTo.x - info.mouseFrom.x);
  const height = Math.abs(info.mouseTo.y - info.mouseFrom.y);

  return { width, height };
};

/**
 * 그리기 도구 기능 훅
 * 도형, 텍스트, 포스트잇 그리기
 */

import { useCallback } from "react";
import * as fabric from "fabric";
import type { DrawingToolType, DrawingTool } from "@/lib/types/drawing";

interface DrawingToolsProps {
  canvas: fabric.Canvas | null;
  tool: DrawingTool;
}

export function useDrawingTools({ canvas, tool }: DrawingToolsProps) {
  /**
   * 사각형 추가
   */
  const addRectangle = useCallback(
    (left: number, top: number, width: number, height: number) => {
      if (!canvas) return;

      const rect = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: "transparent",
        stroke: tool.color,
        strokeWidth: tool.strokeWidth,
        strokeOpacity: tool.opacity,
      });

      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.renderAll();
    },
    [canvas, tool]
  );

  /**
   * 원 추가
   */
  const addCircle = useCallback(
    (left: number, top: number, radius: number) => {
      if (!canvas) return;

      const circle = new fabric.Circle({
        left,
        top,
        radius,
        fill: "transparent",
        stroke: tool.color,
        strokeWidth: tool.strokeWidth,
        strokeOpacity: tool.opacity,
      });

      canvas.add(circle);
      canvas.setActiveObject(circle);
      canvas.renderAll();
    },
    [canvas, tool]
  );

  /**
   * 직선 추가
   */
  const addLine = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      if (!canvas) return;

      const line = new fabric.Line([x1, y1, x2, y2], {
        stroke: tool.color,
        strokeWidth: tool.strokeWidth,
        strokeOpacity: tool.opacity,
      });

      canvas.add(line);
      canvas.setActiveObject(line);
      canvas.renderAll();
    },
    [canvas, tool]
  );

  /**
   * 화살표 추가 (선 + 삼각형 조합)
   * @param x1 시작점 X
   * @param y1 시작점 Y
   * @param x2 끝점 X
   * @param y2 끝점 Y
   */
  const addArrow = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      if (!canvas) return;

      // 방향 벡터
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) return;

      // 단위 벡터
      const ux = dx / length;
      const uy = dy / length;

      // 화살표 머리 크기
      const arrowHeadSize = 15;

      // 화살표 머리 포인트
      const arrowPoints = [
        [x2, y2],
        [
          x2 - arrowHeadSize * ux - arrowHeadSize * uy,
          y2 - arrowHeadSize * uy + arrowHeadSize * ux,
        ],
        [
          x2 - arrowHeadSize * ux + arrowHeadSize * uy,
          y2 - arrowHeadSize * uy - arrowHeadSize * ux,
        ],
      ];

      // 선 그리기
      const line = new fabric.Line([x1, y1, x2, y2], {
        stroke: tool.color,
        strokeWidth: tool.strokeWidth,
        strokeOpacity: tool.opacity,
      });
      canvas.add(line);

      // 화살표 머리 (삼각형)
      const arrowHead = new fabric.Polygon(
        arrowPoints as any,
        {
          fill: tool.color,
          stroke: tool.color,
          strokeWidth: tool.strokeWidth,
          strokeOpacity: tool.opacity,
        } as any
      );
      canvas.add(arrowHead);

      canvas.renderAll();
    },
    [canvas, tool]
  );

  /**
   * 텍스트 상자 추가
   */
  const addTextBox = useCallback(
    (left: number, top: number, text: string = "텍스트") => {
      if (!canvas) return;

      const textbox = new fabric.Textbox(text, {
        left,
        top,
        width: 200,
        fontSize: tool.fontSize || 16,
        fill: tool.color,
        fontFamily: "Arial",
        editable: true,
      });

      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      textbox.enterEditing();
      textbox.selectAll();
      canvas.renderAll();
    },
    [canvas, tool]
  );

  /**
   * 포스트잇 스티커 추가
   */
  const addStickyNote = useCallback(
    (left: number, top: number, text: string = "메모") => {
      if (!canvas) return;

      const stickyWidth = 150;
      const stickyHeight = 150;

      // 배경 (노란색 사각형)
      const bg = new fabric.Rect({
        left,
        top,
        width: stickyWidth,
        height: stickyHeight,
        fill: tool.color || "#FFFF99",
        stroke: "#CCCC00",
        strokeWidth: 1,
        shadow: new fabric.Shadow({
          blur: 5,
          offsetX: 2,
          offsetY: 2,
          color: "rgba(0, 0, 0, 0.3)",
        }),
      });
      canvas.add(bg);

      // 텍스트
      const textBox = new fabric.Textbox(text, {
        left: left + 8,
        top: top + 8,
        width: stickyWidth - 16,
        fontSize: tool.fontSize || 14,
        fill: "#333333",
        fontFamily: "Arial",
        editable: true,
        splitByGrapheme: true,
      });
      canvas.add(textBox);

      canvas.setActiveObject(textBox);
      textBox.enterEditing();
      textBox.selectAll();
      canvas.renderAll();
    },
    [canvas, tool]
  );

  /**
   * 선택된 객체 삭제
   */
  const deleteSelected = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, [canvas]);

  /**
   * 모든 객체 선택
   */
  const selectAll = useCallback(() => {
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.getObjects().forEach((obj) => canvas.setActiveObject(obj));
    canvas.renderAll();
  }, [canvas]);

  /**
   * 선택 해제
   */
  const deselect = useCallback(() => {
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  return {
    addRectangle,
    addCircle,
    addLine,
    addArrow,
    addTextBox,
    addStickyNote,
    deleteSelected,
    selectAll,
    deselect,
  };
}

/**
 * 필기 도구 도구모음 (Toolbar)
 * 펜, 형광펜, 지우개, 도형, 텍스트 등 선택
 */

"use client";

import React from "react";
import type { DrawingToolType, DrawingTool } from "@/lib/types/drawing";
import {
  DRAWING_TOOL_DEFAULTS,
  COLOR_PALETTE,
  STROKE_WIDTH_OPTIONS,
} from "@/lib/types/drawing";

interface DrawingToolbarProps {
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export function DrawingToolbar({
  currentTool,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: DrawingToolbarProps) {
  const tools: Array<{
    type: DrawingToolType;
    label: string;
    icon: string;
  }> = [
    { type: "pen", label: "펜", icon: "✏️" },
    { type: "highlighter", label: "형광펜", icon: "🖍️" },
    { type: "eraser", label: "지우개", icon: "🧹" },
    { type: "laser", label: "포인터", icon: "🔴" },
    { type: "rectangle", label: "사각형", icon: "⬜" },
    { type: "circle", label: "원", icon: "⭕" },
    { type: "line", label: "직선", icon: "📏" },
    { type: "arrow", label: "화살표", icon: "➡️" },
    { type: "text", label: "텍스트", icon: "📝" },
    { type: "sticky-note", label: "포스트잇", icon: "📌" },
  ];

  const handleToolClick = (toolType: DrawingToolType) => {
    const defaultTool = DRAWING_TOOL_DEFAULTS[toolType];
    onToolChange(defaultTool);
  };

  return (
    <div className="bg-[#2F2F2F] rounded-xl p-4 space-y-4 border border-[#575757]">
      {/* 도구 선택 */}
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-2">도구</div>
        <div className="grid grid-cols-5 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => handleToolClick(tool.type)}
              className={`p-2 rounded-lg transition-colors text-sm font-medium flex flex-col items-center gap-1 ${
                currentTool.type === tool.type
                  ? "bg-[#AFC02B] text-white"
                  : "bg-[#3C3C3C] text-gray-300 hover:bg-[#4C4C4C]"
              }`}
              title={tool.label}
            >
              <span className="text-lg">{tool.icon}</span>
              <span className="text-xs">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 색상 선택 */}
      {currentTool.type !== "eraser" && currentTool.type !== "laser" && (
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-2">
            색상
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                  currentTool.color === color
                    ? "border-white scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* 선 굵기 선택 */}
      {(currentTool.type === "pen" ||
        currentTool.type === "highlighter" ||
        currentTool.type === "eraser" ||
        ["rectangle", "circle", "line", "arrow"].includes(currentTool.type)) && (
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-2">
            선 굵기
          </div>
          <div className="flex gap-2 flex-wrap">
            {STROKE_WIDTH_OPTIONS.map((width) => (
              <button
                key={width}
                onClick={() => onStrokeWidthChange(width)}
                className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  currentTool.strokeWidth === width
                    ? "bg-[#AFC02B] text-white"
                    : "bg-[#3C3C3C] text-gray-300 hover:bg-[#4C4C4C]"
                }`}
              >
                {width}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Undo/Redo 버튼 */}
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-2">작업</div>
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-1 px-3 py-2 bg-[#3C3C3C] text-gray-300 rounded-lg font-medium text-sm hover:bg-[#4C4C4C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="취소 (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex-1 px-3 py-2 bg-[#3C3C3C] text-gray-300 rounded-lg font-medium text-sm hover:bg-[#4C4C4C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="다시 실행 (Ctrl+Y)"
          >
            ↷ Redo
          </button>
        </div>
      </div>

      {/* 초기화 버튼 */}
      <button
        onClick={onClear}
        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
      >
        🗑️ Clear All
      </button>

      {/* 현재 도구 정보 */}
      <div className="bg-[#1E1E1E] rounded-lg p-3 text-xs text-gray-400 space-y-1">
        <div>
          <span className="font-semibold text-gray-300">현재 도구:</span>{" "}
          {
            tools.find((t) => t.type === currentTool.type)?.label
          }
        </div>
        {currentTool.color && (
          <div>
            <span className="font-semibold text-gray-300">색상:</span>{" "}
            {currentTool.color}
          </div>
        )}
        {currentTool.strokeWidth && (
          <div>
            <span className="font-semibold text-gray-300">굵기:</span>{" "}
            {currentTool.strokeWidth}px
          </div>
        )}
      </div>
    </div>
  );
}

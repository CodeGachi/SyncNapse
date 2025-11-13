/**
 * 필기 도구 사이드바 - 도구 선택, 색상, 크기, 액션 버튼
 * 우측 세로 80px 바
 */

"use client";

import { DRAWING_TOOL_DEFAULTS, type DrawingTool } from "@/lib/types/drawing";

interface DrawingSidebarProps {
  isEnabled: boolean;
  isDrawingMode: boolean;
  currentTool: DrawingTool;
  penColor: string;
  penSize: number;
  canUndo: boolean;
  canRedo: boolean;
  onDrawingModeChange: (enabled: boolean) => void;
  onToolChange: (toolType: string) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const NAVBAR_WIDTH = 80;

export function DrawingSidebar({
  isEnabled,
  isDrawingMode,
  currentTool,
  penColor,
  penSize,
  canUndo,
  canRedo,
  onDrawingModeChange,
  onToolChange,
  onColorChange,
  onSizeChange,
  onUndo,
  onRedo,
  onClear,
}: DrawingSidebarProps) {
  const tools = [
    // 선택 도구
    { type: "hand", label: "👆\n선택", key: "hand", category: "select" },

    // 기본 그리기 도구
    { type: "pen", label: "✏️\n펜", key: "pen", category: "draw" },
    { type: "highlighter", label: "🖍️\n형광펜", key: "highlighter", category: "draw" },
    { type: "eraser", label: "🧹\n지우개", key: "eraser", category: "draw" },

    // 도형 도구
    { type: "solidLine", label: "📏\n직선", key: "solidLine", category: "shape" },
    { type: "dashedLine", label: "⋯\n점선", key: "dashedLine", category: "shape" },
    { type: "arrowLine", label: "➜\n화살표", key: "arrowLine", category: "shape" },
    { type: "rect", label: "▭\n사각형", key: "rect", category: "shape" },
    { type: "circle", label: "●\n원", key: "circle", category: "shape" },
    { type: "triangle", label: "▲\n삼각형", key: "triangle", category: "shape" },
  ] as const;

  const handleToolClick = (toolType: string) => {
    onToolChange(toolType);
  };

  if (!isEnabled) return null;

  return (
    <div
      className="bg-gradient-to-l from-black/90 to-black/60 backdrop-blur-sm py-2 px-1 flex flex-col gap-2 border-l border-[#AFC02B]/40 overflow-auto"
      style={{
        width: `${NAVBAR_WIDTH}px`,
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* 모드 토글 버튼 - 필기/뷰어 모드 전환 */}
      <button
        onClick={() => onDrawingModeChange(!isDrawingMode)}
        className={`w-full px-1 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap text-center ${
          isDrawingMode
            ? "bg-[#AFC02B] text-black shadow-lg"
            : "bg-white/15 text-white hover:bg-white/25"
        }`}
        title={isDrawingMode ? "뷰어 모드로 전환" : "필기 모드로 전환"}
      >
        {isDrawingMode ? "✏️\n필기" : "👆\n뷰어"}
      </button>

      {/* 구분선 */}
      <div className="w-full h-px bg-white/20" />

      {/* 도구 선택 - 스크롤 가능 */}
      <div className="flex flex-col gap-1 overflow-y-auto flex-1">
        {/* 선택 도구 섹션 */}
        <div className="text-xs text-gray-400 px-1 py-1">선택</div>
        {tools.filter((t: any) => t.category === "select").map((tool) => (
          <button
            key={tool.key}
            onClick={() => handleToolClick(tool.type)}
            disabled={!isDrawingMode}
            className={`px-1 py-1 rounded-md text-xs font-medium transition-all text-center ${
              currentTool.type === tool.type && isDrawingMode
                ? "bg-[#AFC02B] text-black shadow-lg"
                : "bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
            title={tool.label.replace(/\n/g, " ")}
          >
            {tool.label.split("\n").map((word: string, i: number) => (
              <div key={i}>{word}</div>
            ))}
          </button>
        ))}

        {/* 그리기 도구 섹션 */}
        <div className="text-xs text-gray-400 px-1 py-1 pt-2">그리기</div>
        {tools.filter((t: any) => t.category === "draw").map((tool) => (
          <button
            key={tool.key}
            onClick={() => handleToolClick(tool.type)}
            disabled={!isDrawingMode}
            className={`px-1 py-1 rounded-md text-xs font-medium transition-all text-center ${
              currentTool.type === tool.type && isDrawingMode
                ? "bg-[#AFC02B] text-black shadow-lg"
                : "bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
            title={tool.label.replace(/\n/g, " ")}
          >
            {tool.label.split("\n").map((word: string, i: number) => (
              <div key={i}>{word}</div>
            ))}
          </button>
        ))}

        {/* 도형 도구 섹션 */}
        <div className="text-xs text-gray-400 px-1 py-1 pt-2">도형</div>
        {tools.filter((t: any) => t.category === "shape").map((tool) => (
          <button
            key={tool.key}
            onClick={() => handleToolClick(tool.type)}
            disabled={!isDrawingMode}
            className={`px-1 py-1 rounded-md text-xs font-medium transition-all text-center ${
              currentTool.type === tool.type && isDrawingMode
                ? "bg-[#AFC02B] text-black shadow-lg"
                : "bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
            title={tool.label.replace(/\n/g, " ")}
          >
            {tool.label.split("\n").map((word: string, i: number) => (
              <div key={i}>{word}</div>
            ))}
          </button>
        ))}
      </div>

      {/* 색상 선택 (펜/형광펜 모드에만 표시) */}
      {currentTool.type !== "eraser" && (
        <div className="flex flex-col items-center gap-1 w-full border-t border-white/20 pt-2">
          <label className="text-xs text-white">색상</label>
          <input
            type="color"
            value={penColor}
            onChange={(e) => onColorChange(e.target.value)}
            disabled={!isDrawingMode}
            className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="펜 색상"
          />
        </div>
      )}

      {/* 펜 크기 선택 */}
      <div className="flex flex-col items-center gap-1 w-full border-t border-white/20 pt-2">
        <label className="text-xs text-white">크기</label>
        <input
          type="range"
          min="1"
          max="20"
          value={penSize}
          onChange={(e) => onSizeChange(parseInt(e.target.value))}
          disabled={!isDrawingMode}
          className="w-12 h-1 accent-[#AFC02B] disabled:opacity-50 disabled:cursor-not-allowed"
          title={`펜 크기: ${penSize}px`}
        />
        <span className="text-xs text-white/60">{penSize}</span>
      </div>

      {/* 작업 버튼 */}
      <div className="flex flex-col gap-1 w-full border-t border-white/20 pt-2">
        <button
          onClick={onUndo}
          disabled={!canUndo || !isDrawingMode}
          className="px-1 py-1 bg-white/15 text-white rounded text-xs hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="실행취소 (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo || !isDrawingMode}
          className="px-1 py-1 bg-white/15 text-white rounded text-xs hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="다시실행 (Ctrl+Y)"
        >
          ↷
        </button>
        <button
          onClick={onClear}
          disabled={!isDrawingMode}
          className="px-1 py-1 bg-red-600/60 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="전체 지우기"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

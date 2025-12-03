/**
 * 필기 도구 사이드바 - Figma 디자인에 맞춘 42px 세로 바
 */

"use client";

import { useState, useRef } from "react";
import { useDrawStore, useToolsStore } from "@/stores";
import { PenSizePopup } from "./pen-size-popup";
import { ColorPickerPopup } from "./color-picker-popup";
import Image from "next/image";

interface DrawingSidebarProps {
  isEnabled: boolean;
  isDrawingMode: boolean;
  onDrawingModeChange: (enabled: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const NAVBAR_WIDTH = 56;

// SVG 아이콘 컴포넌트들
const LineIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const RectIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="16" height="12" stroke="currentColor" strokeWidth="2" fill="none" rx="1"/>
  </svg>
);

const CircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 7L19 12L14 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const PenSizeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="6" r="2" fill="currentColor"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <circle cx="12" cy="19" r="4" fill="currentColor"/>
  </svg>
);

const ColorPaletteIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="6" fill={color}/>
  </svg>
);

export function DrawingSidebar({
  isEnabled,
  isDrawingMode,
  onDrawingModeChange,
  onUndo,
  onRedo,
}: DrawingSidebarProps) {
  // 도구 상태 직접 구독
  const drawStore = useDrawStore();
  const currentTool = drawStore.type;
  const penColor = drawStore.lineColor;
  const penSize = drawStore.lineWidth;

  // Undo/Redo 상태 직접 구독
  const canUndo = useToolsStore((state) => state.undoArr.length > 0);
  const canRedo = useToolsStore((state) => state.redoArr.length > 0);

  const [showPenSizePopup, setShowPenSizePopup] = useState(false);
  const [showColorPopup, setShowColorPopup] = useState(false);

  const penSizeButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);

  // 커서 버튼: 뷰어 모드 ↔ 필기 모드(hand) 토글
  const handleCursorClick = () => {
    if (!isDrawingMode) {
      // 뷰어 모드 → 필기 모드로 전환
      onDrawingModeChange(true);
      drawStore.setDrawType("hand");
    } else {
      // 필기 모드 → 뷰어 모드로 전환
      onDrawingModeChange(false);
    }
  };

  const handleToolClick = (toolType: string) => {
    if (!isDrawingMode) {
      onDrawingModeChange(true);
    }
    drawStore.setDrawType(toolType as any);
  };

  if (!isEnabled) return null;

  // 도구 버튼 공통 스타일
  const getButtonStyle = (isActive: boolean, isDisabled: boolean = false) => {
    if (isDisabled) {
      return "bg-white/5 text-white/30 cursor-not-allowed";
    }
    return isActive
      ? "bg-[#AFC02B] text-black"
      : "bg-white/10 text-white hover:bg-white/20";
  };

  return (
    <div
      className="bg-[#363636] border-2 border-[#b9b9b9] rounded-[15px] p-2 flex flex-col gap-3 overflow-auto"
      style={{
        width: `${NAVBAR_WIDTH}px`,
        height: "fit-content",
        maxHeight: "90vh",
        flexShrink: 0,
      }}
    >
      {/* 1. 커서 (뷰어/필기 모드 토글) */}
      <button
        onClick={handleCursorClick}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          isDrawingMode && currentTool === "hand"
        )}`}
        title={isDrawingMode ? "뷰어 모드로 전환" : "필기 모드로 전환"}
      >
        <Image
          src="/필기바/iconstack.io - (Cursor Fill).svg"
          alt="커서"
          width={24}
          height={24}
          className={isDrawingMode && currentTool === "hand" ? "brightness-0" : ""}
        />
      </button>

      {/* 2. 펜 */}
      <button
        onClick={() => handleToolClick("pen")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "pen"
        )}`}
        title="펜"
      >
        <Image
          src="/필기바/iconstack.io - (Pen).svg"
          alt="펜"
          width={24}
          height={24}
          className={currentTool === "pen" ? "brightness-0" : ""}
        />
      </button>

      {/* 3. 형광펜 */}
      <button
        onClick={() => handleToolClick("highlighter")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "highlighter"
        )}`}
        title="형광펜"
      >
        <Image
          src="/필기바/iconstack.io - (Highlighter 1).svg"
          alt="형광펜"
          width={24}
          height={24}
          className={currentTool === "highlighter" ? "brightness-0" : ""}
        />
      </button>

      {/* 4. 지우개 */}
      <button
        onClick={() => handleToolClick("eraser")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "eraser"
        )}`}
        title="지우개"
      >
        <Image
          src="/필기바/iconstack.io - (Eraser).svg"
          alt="지우개"
          width={24}
          height={24}
          className={currentTool === "eraser" ? "brightness-0" : ""}
        />
      </button>

      {/* 5. 펜굵기 설정 */}
      <button
        ref={penSizeButtonRef}
        onClick={() => setShowPenSizePopup(!showPenSizePopup)}
        disabled={!isDrawingMode}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          false,
          !isDrawingMode
        )}`}
        title="펜 굵기"
      >
        <PenSizeIcon />
      </button>
      {showPenSizePopup && (
        <PenSizePopup
          currentSize={penSize}
          onSizeSelect={(size) => drawStore.setLineWidth(size)}
          onClose={() => setShowPenSizePopup(false)}
          buttonRef={penSizeButtonRef}
        />
      )}

      {/* 6. 색상 선택 */}
      <button
        ref={colorButtonRef}
        onClick={() => setShowColorPopup(!showColorPopup)}
        disabled={!isDrawingMode}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          false,
          !isDrawingMode
        )}`}
        title="색상"
      >
        <ColorPaletteIcon color={penColor} />
      </button>
      {showColorPopup && (
        <ColorPickerPopup
          currentColor={penColor}
          onColorSelect={(color) => drawStore.setLineColor(color)}
          onClose={() => setShowColorPopup(false)}
          buttonRef={colorButtonRef}
        />
      )}

      {/* 7. 직선 */}
      <button
        onClick={() => handleToolClick("solidLine")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "solidLine"
        )}`}
        title="직선"
      >
        <LineIcon />
      </button>

      {/* 8. 사각형 */}
      <button
        onClick={() => handleToolClick("rect")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "rect"
        )}`}
        title="사각형"
      >
        <RectIcon />
      </button>

      {/* 9. 원 */}
      <button
        onClick={() => handleToolClick("circle")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "circle"
        )}`}
        title="원"
      >
        <CircleIcon />
      </button>

      {/* 10. 화살표 */}
      <button
        onClick={() => handleToolClick("arrowLine")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "arrowLine"
        )}`}
        title="화살표"
      >
        <ArrowIcon />
      </button>

      {/* 11. Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || !isDrawingMode}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          false,
          !canUndo || !isDrawingMode
        )}`}
        title="실행취소"
      >
        <Image
          src="/필기바/iconstack.io - (Undo 02).svg"
          alt="실행취소"
          width={24}
          height={24}
          className={!canUndo || !isDrawingMode ? "opacity-30" : ""}
        />
      </button>

      {/* 12. Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo || !isDrawingMode}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          false,
          !canRedo || !isDrawingMode
        )}`}
        title="다시실행"
      >
        <Image
          src="/필기바/iconstack.io - (Redo 02).svg"
          alt="다시실행"
          width={24}
          height={24}
          className={!canRedo || !isDrawingMode ? "opacity-30" : ""}
        />
      </button>
    </div>
  );
}

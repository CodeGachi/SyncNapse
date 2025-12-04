/**
 * 필기 도구 사이드바 - Figma 디자인에 맞춘 42px 세로 바
 */

"use client";

import { useState, useRef } from "react";
import { useDrawStore, useToolsStore } from "@/stores";
import { PenSizePopup } from "./pen-size-popup";
import { ColorPickerPopup } from "./color-picker-popup";

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

const CursorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.6711 19.4804L19.4814 20.6701C19.3769 20.775 19.2527 20.8582 19.1159 20.915C18.9792 20.9718 18.8326 21.001 18.6845 21.001C18.5365 21.001 18.3899 20.9718 18.2531 20.915C18.1164 20.8582 17.9922 20.775 17.8877 20.6701L12.5842 15.3667L10.7814 20.0692L10.7692 20.1001C10.6543 20.3678 10.4631 20.5958 10.2196 20.7556C9.97604 20.9155 9.69085 21.0002 9.39953 20.9992H9.3264C9.02268 20.9865 8.7302 20.8807 8.48857 20.6962C8.24694 20.5118 8.06782 20.2575 7.97547 19.9679L3.07515 4.96043C2.98921 4.69782 2.9777 4.41654 3.04192 4.14779C3.10614 3.87905 3.24356 3.63335 3.43894 3.43797C3.63433 3.24259 3.88002 3.10516 4.14877 3.04094C4.41751 2.97673 4.6988 2.98823 4.9614 3.07418L19.9689 7.97449C20.2557 8.07044 20.5069 8.25085 20.6893 8.49206C20.8718 8.73327 20.9771 9.024 20.9914 9.32611C21.0057 9.62822 20.9283 9.9276 20.7694 10.185C20.6105 10.4423 20.3776 10.6456 20.1011 10.7682L20.0702 10.7804L15.3677 12.587L20.6711 17.8895C20.8821 18.1005 21.0006 18.3866 21.0006 18.685C21.0006 18.9833 20.8821 19.2695 20.6711 19.4804Z" fill="currentColor"/>
  </svg>
);

const PenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M14.7566 2.62145C16.5852 0.79285 19.5499 0.79285 21.3785 2.62145C23.2071 4.45005 23.2071 7.41479 21.3785 9.24339L11.8932 18.7287C11.3513 19.2706 11.0323 19.5897 10.6774 19.8665C10.2591 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96302 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13353 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM4.40051 20.8201L7.24203 19.8729C8.03314 19.6092 8.36927 19.4958 8.68233 19.3466C9.06287 19.1653 9.42252 18.943 9.75492 18.6837C10.0283 18.4704 10.2801 18.2205 10.8698 17.6308L18.4392 10.0614C17.6506 9.78321 16.6346 9.26763 15.6835 8.31651C14.7324 7.36538 14.2168 6.34939 13.9386 5.56075L6.36917 13.1302C5.77951 13.7199 5.52959 13.9716 5.3163 14.2451C5.05704 14.5775 4.83476 14.9371 4.6534 15.3177C4.50421 15.6307 4.3908 15.9669 4.12709 16.758L3.17992 19.5995L4.40051 20.8201ZM15.1553 4.34404C15.1895 4.519 15.2473 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7441 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2431 8.75266 19.481 8.81046 19.6559 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1553 4.34404Z" fill="currentColor"/>
  </svg>
);

const HighlighterIcon = () => (
  <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M11.2277 17.7884C11.0288 17.7884 10.838 17.7093 10.6974 17.5687L10.5208 17.3921L8.92999 18.9829C8.43153 19.4814 7.7072 19.6163 7.08648 19.3876C7.05762 19.4326 7.02381 19.4748 6.98541 19.5132L6.62159 19.877C6.44318 20.0554 6.18701 20.1322 5.93989 20.0812L3.59474 19.598C3.3246 19.5423 3.10682 19.3429 3.02766 19.0786C2.94851 18.8144 3.02075 18.5281 3.21578 18.3331L4.51053 17.0383C4.54946 16.9994 4.59159 16.9656 4.63609 16.9371C4.40758 16.3164 4.54252 15.5922 5.0409 15.0938L6.63171 13.503L6.45474 13.326C6.16185 13.0332 6.16185 12.5583 6.45474 12.2654L14.94 3.7801C15.8187 2.90142 17.2433 2.90142 18.122 3.7801L20.2433 5.90142C21.122 6.7801 21.122 8.20472 20.2433 9.0834L11.758 17.5687C11.6174 17.7093 11.4266 17.7884 11.2277 17.7884ZM9.46014 16.3314L7.69237 14.5637L6.10156 16.1545C6.00393 16.2521 6.00393 16.4104 6.10156 16.508L7.51578 17.9223C7.61341 18.0199 7.7717 18.0199 7.86933 17.9223L9.46014 16.3314ZM11.0513 15.8009L11.065 15.8149L11.2277 15.9777L19.1827 8.02274C19.4756 7.72985 19.4756 7.25498 19.1827 6.96208L17.0613 4.84076C16.7684 4.54787 16.2936 4.54787 16.0007 4.84076L8.04573 12.7957L8.20876 12.9587L8.22288 12.9725L11.0513 15.8009Z" fill="currentColor"/>
  </svg>
);

const EraserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.9998 20.0008H8.49982L4.28982 15.7008C4.10357 15.5134 3.99902 15.26 3.99902 14.9958C3.99902 14.7316 4.10357 14.4782 4.28982 14.2908L14.2898 4.29079C14.4772 4.10454 14.7306 4 14.9948 4C15.259 4 15.5125 4.10454 15.6998 4.29079L20.6998 9.29079C20.8861 9.47815 20.9906 9.73161 20.9906 9.99579C20.9906 10.26 20.8861 10.5134 20.6998 10.7008L11.4998 20.0008" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.0002 13.3L11.7002 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UndoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.0001 21C16.9707 21 21.0001 16.9706 21.0001 12C21.0001 7.02944 16.9707 3 12.0001 3C8.66879 3 5.76024 4.80989 4.2041 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 3V4.27816C3 6.47004 3 7.56599 3.70725 8.16512C4.4145 8.76425 5.49553 8.58408 7.6576 8.22373L9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RedoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3313 3 18.2398 4.80989 19.796 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.999 3V4.27816C20.999 6.47004 20.999 7.56599 20.2917 8.16512C19.5845 8.76425 18.5035 8.58408 16.3414 8.22373L14.999 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
      return "bg-foreground/5 text-foreground/30 cursor-not-allowed";
    }
    return isActive
      ? "bg-brand text-black"
      : "bg-foreground/10 text-foreground hover:bg-foreground/20";
  };

  return (
    <div
      className="bg-background-elevated border-2 border-border-strong rounded-[15px] p-2 flex flex-col gap-3 overflow-auto"
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
        <CursorIcon />
      </button>

      {/* 2. 펜 */}
      <button
        onClick={() => handleToolClick("pen")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "pen"
        )}`}
        title="펜"
      >
        <PenIcon />
      </button>

      {/* 3. 형광펜 */}
      <button
        onClick={() => handleToolClick("highlighter")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "highlighter"
        )}`}
        title="형광펜"
      >
        <HighlighterIcon />
      </button>

      {/* 4. 지우개 */}
      <button
        onClick={() => handleToolClick("eraser")}
        className={`w-full h-10 rounded-md transition-all flex items-center justify-center ${getButtonStyle(
          currentTool === "eraser"
        )}`}
        title="지우개"
      >
        <EraserIcon />
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
        <UndoIcon />
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
        <RedoIcon />
      </button>
    </div>
  );
}

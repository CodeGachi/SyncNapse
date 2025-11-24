/**
 * 펜 굵기 선택 팝업
 */

"use client";

import { useEffect, useRef } from "react";

interface PenSizePopupProps {
  currentSize: number;
  onSizeSelect: (size: number) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

const PRESET_SIZES = [1, 2, 3, 5, 8, 12, 16, 20];

export function PenSizePopup({
  currentSize,
  onSizeSelect,
  onClose,
  buttonRef,
}: PenSizePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // 팝업 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, buttonRef]);

  // 팝업 위치 계산 (왼쪽에 표시)
  const getPopupPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 120; // w-24 + padding + border
    return {
      position: "fixed" as const,
      right: `${window.innerWidth - rect.left + 24}px`,
      top: `${rect.top}px`,
    };
  };

  return (
    <div
      ref={popupRef}
      className="bg-[#363636] border-2 border-[#b9b9b9] rounded-lg p-3 shadow-lg z-50"
      style={getPopupPosition()}
    >
      <div className="flex flex-col gap-2">
        <div className="text-xs text-white/60 px-1">펜 굵기</div>
        {PRESET_SIZES.map((size) => (
          <button
            key={size}
            onClick={() => {
              onSizeSelect(size);
              onClose();
            }}
            className={`w-24 px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
              currentSize === size
                ? "bg-[#AFC02B] text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <span>{size}px</span>
            <div
              className="rounded-full bg-current"
              style={{ width: `${size}px`, height: `${size}px` }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

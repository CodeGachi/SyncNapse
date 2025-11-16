/**
 * 색상 선택 팝업
 */

"use client";

import { useEffect, useRef, useState } from "react";

interface ColorPickerPopupProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

const PRESET_COLORS = [
  { name: "검정", value: "#000000" },
  { name: "빨강", value: "#FF0000" },
  { name: "파랑", value: "#0000FF" },
  { name: "초록", value: "#00FF00" },
  { name: "노랑", value: "#FFFF00" },
  { name: "주황", value: "#FF8800" },
  { name: "보라", value: "#8800FF" },
  { name: "분홍", value: "#FF00FF" },
];

export function ColorPickerPopup({
  currentColor,
  onColorSelect,
  onClose,
  buttonRef,
}: ColorPickerPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [customColor, setCustomColor] = useState(currentColor);

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
      <div className="flex flex-col gap-4">
        {/* 프리셋 색상 */}
        <div>
          <div className="text-xs text-white/60 mb-2">프리셋 색상</div>
          <div className="grid grid-cols-4 gap-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  onColorSelect(color.value);
                  setCustomColor(color.value);
                }}
                className={`w-8 h-8 rounded-md transition-all ${
                  currentColor.toLowerCase() === color.value.toLowerCase()
                    ? "ring-2 ring-[#AFC02B] ring-offset-2 ring-offset-[#363636]"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* 커스텀 색상 선택 */}
        <div>
          <div className="text-xs text-white/60 mb-2">커스텀 색상</div>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onColorSelect(e.target.value);
              }}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={customColor.toUpperCase()}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setCustomColor(value);
                  if (value.length === 7) {
                    onColorSelect(value);
                  }
                }
              }}
              className="flex-1 px-2 py-1 bg-white/10 text-white text-xs rounded border border-white/20 focus:outline-none focus:border-[#AFC02B]"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

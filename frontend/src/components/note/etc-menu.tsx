/**
 * etc 메뉴 드롭다운 컴포넌트
 * exam, summary, question 등 추가 기능 접근
 */

"use client";

import { useEffect, useRef } from "react";

interface EtcMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  color?: string;
}

interface EtcMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: EtcMenuItem[];
  anchorPosition?: { top: number; left: number };
}

export function EtcMenu({
  isOpen,
  onClose,
  items,
  anchorPosition,
}: EtcMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[160px] bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden"
      style={
        anchorPosition
          ? { top: anchorPosition.top, left: anchorPosition.left }
          : undefined
      }
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-white hover:bg-[#3a3a3a] transition-colors duration-150 flex items-center gap-3"
        >
          {item.color && (
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 헤더 메뉴 - Dropdown Menu Component
 * 메뉴 아이콘 클릭 시 표시되는 드롭다운 메뉴
 */

"use client";

import { useEffect, useRef } from "react";

interface HeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeaderMenu({ isOpen, onClose }: HeaderMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // 메뉴 버튼 클릭은 무시 (버튼이 토글 처리함)
      if (target.closest('button[title="메뉴"]')) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    }

    if (isOpen) {
      // mousedown 대신 click 사용하여 버튼 클릭과 타이밍 분리
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-14 left-14 w-[197px] min-h-[181px] bg-[#2f2f2f] border border-[#393939] rounded-[10px] shadow-lg z-50"
    >
      {/* 메뉴 항목은 추후 추가 예정 */}
      <div className="p-4">
        <p className="text-gray-400 text-sm">메뉴 항목 준비중...</p>
      </div>
    </div>
  );
}

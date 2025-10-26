/**
 * etc 패널 메뉴 버튼 컴포넌트
 */

"use client";

interface MenuButtonProps {
  label: string;
  onClick: () => void;
  color: string;
  badge?: number;
}

export function MenuButton({ label, onClick, color, badge }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col justify-center items-center w-[165px] h-[70px] ${color} rounded-[24px] hover:opacity-80 transition-opacity relative`}
    >
      <span className="font-bold text-base leading-[19px] text-white">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

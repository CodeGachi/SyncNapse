/**
 * 노트 좌측 사이드바 UI 컴포넌트
 * 아이콘 메뉴 표시
 */

"use client";

export function NoteSidebar() {
  return (
    <aside className="bg-[#101013] border-r border-[#2f2f2f] flex flex-col items-center py-4 w-[66px] h-full">
      {/* 로고 */}
      <div className="mb-6">
        <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
          <path
            d="M14 0L0 8V24L14 32L28 24V8L14 0Z"
            fill="#5E5E67"
          />
        </svg>
      </div>

      {/* 아이콘 메뉴 */}
      <div className="flex flex-col gap-2 items-center">
        {/* 기능 1 */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-[45px] h-[45px] bg-[#5E5E67] rounded-lg" />
          <p className="text-[#5e5e67] text-[14px] font-bold">기능</p>
        </button>

        {/* 기능 2 */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-[45px] h-[45px] bg-[#5E5E67] rounded-lg" />
          <p className="text-[#5e5e67] text-[14px] font-bold">기능</p>
        </button>

        {/* 기능 3 */}
        <button className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-[45px] h-[45px] bg-[#5E5E67] rounded-lg flex items-center justify-center">
            <div className="w-[25px] h-[23px] bg-[#5E5E67] rounded" />
          </div>
          <p className="text-[#5e5e67] text-[14px] font-bold">기능</p>
        </button>
      </div>
    </aside>
  );
}

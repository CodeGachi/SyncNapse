"use client";

import { useRouter } from "next/navigation";

/**
 * Note left sidebar UI component
 */
export function NoteSidebar() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push("/dashboard/main");
  };

  return (
    <aside className="bg-[#101013] border-r border-[#2f2f2f] flex flex-col items-center py-4 w-[66px] flex-shrink-0 h-full">
        <button
          onClick={handleLogoClick}
          className="mb-6 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
            <path
              d="M14 0L0 8V24L14 32L28 24V8L14 0Z"
              fill="#5E5E67"
            />
          </svg>
        </button>

        <div className="flex-1 flex flex-col gap-2 items-center">
          <button className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-[45px] h-[45px] bg-[#5E5E67] rounded-lg" />
            <p className="text-[#5e5e67] text-[14px] font-bold">기능</p>
          </button>

          <button className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-[45px] h-[45px] bg-[#5E5E67] rounded-lg" />
            <p className="text-[#5e5e67] text-[14px] font-bold">기능</p>
          </button>

          <button className="flex flex-col items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-[45px] h-[45px] bg-[#5E5E67] rounded-lg flex items-center justify-center">
              <div className="w-[25px] h-[23px] bg-[#5E5E67] rounded" />
            </div>
            <p className="text-[#5e5e67] text-[14px] font-bold">기능</p>
          </button>
        </div>

        {/* 용량 아이콘 (하단 고정) */}
        <div className="relative group">
          <div className="w-[45px] h-[45px] bg-[#3a3a3a] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#4a4a4a] transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#b9b9b9" strokeWidth="2" />
              <path d="M12 6v12M8 12h8" stroke="#b9b9b9" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 12m-6 0a6 6 0 1012 0" stroke="#5E5E67" strokeWidth="2" strokeDasharray="4 2" />
            </svg>
          </div>

          {/* 호버 시 표시되는 툴팁 */}
          <div className="absolute left-full ml-2 bottom-0 hidden group-hover:block z-50 w-[180px] bg-[#2a2a2a] border border-[#444444] rounded-lg p-3 shadow-xl">
            <p className="text-white text-xs font-bold mb-1">저장소 용량</p>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#b9b9b9]">사용 중</span>
                <span className="text-white">2.5 GB / 10 GB</span>
              </div>
              <div className="w-full h-2 bg-[#444444] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "25%" }} />
              </div>
            </div>
            <p className="text-[#888888] text-[10px]">7.5 GB 남음</p>
          </div>
        </div>
      </aside>
  );
}

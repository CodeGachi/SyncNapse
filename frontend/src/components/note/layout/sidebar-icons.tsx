/**
 * 우측 사이드바 아이콘 버튼들 - Client Component
 * 우측 패널이 닫혀있을 때 표시되는 아이콘들
 */

"use client";

import { useState, useEffect } from "react";
import { useNoteEditorStore } from "@/stores";

export function SidebarIcons() {
  const { isExpanded, toggleExpand } = useNoteEditorStore();
  const [isVisible, setIsVisible] = useState(true);

  // 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200;
      setIsVisible(window.innerWidth >= minWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (isExpanded || !isVisible) return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-[#2f2f2f] rounded-l-lg p-2">
      {/* 마이크 아이콘 (녹음) */}
      <button
        onClick={toggleExpand}
        className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[#3f3f3f] transition-colors"
        title="녹음"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="7" y="2" width="6" height="10" rx="3" stroke="white" strokeWidth="2" />
          <path d="M4 10c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 16v4M7 20h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* 클립보드 아이콘 (Notes) */}
      <button
        onClick={toggleExpand}
        className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[#3f3f3f] transition-colors"
        title="Notes"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="2" width="12" height="16" rx="1" stroke="white" strokeWidth="2" />
          <path d="M7 6h6M7 10h6M7 14h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* 파일 아이콘 (Files) */}
      <button
        onClick={toggleExpand}
        className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[#3f3f3f] transition-colors"
        title="Files"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M11 2H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7l-6-5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 2v5h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 눈 아이콘 (View) */}
      <button
        onClick={toggleExpand}
        className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[#3f3f3f] transition-colors"
        title="View"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="10" r="3" stroke="white" strokeWidth="2" />
        </svg>
      </button>

      {/* 더보기 아이콘 (More) */}
      <button
        onClick={toggleExpand}
        className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-[#3f3f3f] transition-colors"
        title="More"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="4" r="1.5" fill="white" />
          <circle cx="10" cy="10" r="1.5" fill="white" />
          <circle cx="10" cy="16" r="1.5" fill="white" />
        </svg>
      </button>
    </div>
  );
}

/**
 * 노트 레이아웃 래퍼 - Client Component
 * isExpanded 상태에 따른 메인 영역의 마진 조정
 * 화면 크기에 따라 자동으로 사이드 패널 축소
 */

"use client";

import { useEffect, useState } from "react";
import { useNoteEditorStore } from "@/stores";

interface NoteLayoutWrapperProps {
  children: React.ReactNode;
}

export function NoteLayoutWrapper({ children }: NoteLayoutWrapperProps) {
  const { isExpanded, toggleExpand } = useNoteEditorStore();
  const [isWideScreen, setIsWideScreen] = useState(true);

  // 화면 크기 감지하여 자동으로 사이드 패널 축소
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200; // 최소 화면 너비 (사이드 패널 유지 가능 크기)
      const isWide = window.innerWidth >= minWidth;
      setIsWideScreen(isWide);

      if (!isWide && isExpanded) {
        // 화면이 작아지면 자동으로 축소
        toggleExpand();
      }
    };

    // 초기 체크
    handleResize();

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isExpanded, toggleExpand]);

  // 마진 계산: 확장되었으면 500px, 축소되었고 큰 화면이면 60px, 작은 화면이면 0
  const marginClass = isExpanded ? 'mr-[500px]' : (isWideScreen ? 'mr-[60px]' : 'mr-0');

  return (
    <main className={`flex-1 h-full flex gap-1 p-6 transition-all duration-300 ${marginClass}`}>
      {children}
    </main>
  );
}

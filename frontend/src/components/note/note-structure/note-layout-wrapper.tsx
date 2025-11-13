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

  // Screen Size Detect + Auto Collapse
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200;
      const isWide = window.innerWidth >= minWidth;
      setIsWideScreen(isWide);

      if (!isWide && isExpanded) {
        toggleExpand();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
    // toggleExpand는 Zustand 함수로 안정적이므로 dependency에서 제거
    // isExpanded를 dependency에 포함하면 무한 루프 발생
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Margin calculation
  const marginClass = isExpanded
    ? "mr-[500px]"
    : isWideScreen
    ? "mr-[60px]"
    : "mr-0";

  return (
    <main className={`flex-1 h-full flex gap-1 p-6 transition-all duration-300 ${marginClass}`}>
      {children}
    </main>
  );
}

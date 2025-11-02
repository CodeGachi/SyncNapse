/**
 * 노트 레이아웃 래퍼 - Client Component
 * isExpanded 상태에 따른 메인 영역의 마진 조정
 * 화면 크기에 따라 자동으로 사이드 패널 축소
 */

"use client";

import { useNoteEditorStore } from "@/stores";
import { useNoteLayoutWrapper } from "@/features/note/note-structure/use-note-layout-wrapper";

interface NoteLayoutWrapperProps {
  children: React.ReactNode;
}

export function NoteLayoutWrapper({ children }: NoteLayoutWrapperProps) {
  const { isExpanded, toggleExpand } = useNoteEditorStore();
  const { marginClass } = useNoteLayoutWrapper({ isExpanded, toggleExpand });

  return (
    <main className={`flex-1 h-full flex gap-1 p-6 transition-all duration-300 ${marginClass}`}>
      {children}
    </main>
  );
}

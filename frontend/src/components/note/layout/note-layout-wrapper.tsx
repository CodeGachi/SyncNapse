/**
 * 노트 레이아웃 래퍼 - Client Component
 * isExpanded 상태에 따른 메인 영역의 마진 조정
 */

"use client";

import { useNoteEditorStore } from "@/stores";

interface NoteLayoutWrapperProps {
  children: React.ReactNode;
}

export function NoteLayoutWrapper({ children }: NoteLayoutWrapperProps) {
  const { isExpanded } = useNoteEditorStore();

  return (
    <main className={`flex-1 h-full flex gap-3 p-6 transition-all duration-300 ${isExpanded ? 'mr-[424px]' : ''}`}>
      {children}
    </main>
  );
}

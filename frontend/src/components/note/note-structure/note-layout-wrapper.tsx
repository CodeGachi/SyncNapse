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
  return (
    <main className="flex-1 h-full">
      {/* 뷰어 + 패널 + 아이콘바를 flex로 배치, 뷰어는 fill */}
      <div className="flex gap-1 h-full pt-20 px-2 pb-6">
        {children}
      </div>
    </main>
  );
}

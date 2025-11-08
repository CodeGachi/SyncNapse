/**
 * Educator 노트 Layout
 *
 * Liveblocks Provider로 Educator 노트를 래핑
 * 협업 모드일 때만 Liveblocks 활성화 (조건부 래핑은 page.tsx에서 처리)
 */

import { ReactNode } from "react";

interface EducatorNoteLayoutProps {
  children: ReactNode;
  params: {
    noteId: string;
  };
}

export default function EducatorNoteLayout({
  children,
}: EducatorNoteLayoutProps) {
  // Liveblocks Provider는 page.tsx에서 조건부로 래핑
  // layout은 단순히 children을 렌더링
  return <>{children}</>;
}

/**
 * Educator 노트 Layout
 *
 * Liveblocks Provider로 Educator 노트를 래핑
 * 협업 기능을 위해 항상 Liveblocks 활성화
 */

import { ReactNode } from "react";
import { LiveblocksProvider } from "@/providers/liveblocks-provider";

interface EducatorNoteLayoutProps {
  children: ReactNode;
  params: {
    noteId: string;
  };
}

export default function EducatorNoteLayout({
  children,
  params,
}: EducatorNoteLayoutProps) {
  const { noteId } = params;

  return (
    <LiveblocksProvider noteId={noteId}>
      {children}
    </LiveblocksProvider>
  );
}

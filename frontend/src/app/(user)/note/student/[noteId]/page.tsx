"use client";

import { useEffect } from "react";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/note-structure/note-layout-wrapper";
import { NoteHeader } from "@/components/note/note-structure/note-header";
import { useScriptTranslationStore } from "@/stores";

interface StudentNotePageProps {
  params: {
    noteId: string;
  };
  searchParams: {
    title?: string;
  };
}

export default function StudentNotePage({
  params,
  searchParams,
}: StudentNotePageProps) {
  const { noteId } = params;
  const noteTitle = searchParams.title || "제목 없음";

  // 자막 스토어 초기화
  const { reset: resetScriptTranslation } = useScriptTranslationStore();

  // 노트 변경 시 자막 초기화
  useEffect(() => {
    console.log(`[StudentNotePage] 📝 Note changed to: ${noteId} - resetting script segments`);
    resetScriptTranslation();
  }, [noteId, resetScriptTranslation]);

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* Header - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
      />

      {/* Data Loader - Client Component (TanStack Query + AutoSave) */}
      <NoteDataLoader noteId={noteId}>
        {/* Main Layout Wrapper - Client Component (isExpanded Status Management) */}
        <NoteLayoutWrapper>
          {/* Main Content Area - Client Component */}
          <NoteContentArea noteId={noteId} noteTitle={noteTitle} />

          {/* Right Side Panel - Client Component */}
          <RightSidePanel noteId={noteId} />

          {/* Right Sidebar Icon (When closed) - Client Component */}
          <SidebarIcons noteId={noteId} />
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );
}

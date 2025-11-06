import { NoteSidebar } from "@/components/note/note-structure/note-sidebar";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/note-structure/note-layout-wrapper";

interface EducatorNotePageProps {
  params: {
    noteId: string;
  };
  searchParams: {
    title?: string;
  };
}

/**
 * Educator 노트 페이지
 *
 * 실시간 협업 기능:
 * - Liveblocks를 통한 실시간 Canvas/PDF 공유
 * - 실시간 필기 동기화
 * - 실시간 이모지 반응
 * - 실시간 질문/답변 (Q&A)
 * - 실시간 투표 (Poll)
 * - 손들기 기능
 *
 * TODO: Liveblocks 통합
 * 1. RoomProvider로 컴포넌트 래핑
 * 2. Canvas 실시간 동기화
 * 3. Collaboration 상태 Liveblocks Storage로 마이그레이션
 */
export default function EducatorNotePage({
  params,
  searchParams,
}: EducatorNotePageProps) {
  const { noteId } = params;
  const noteTitle = searchParams.title || "제목 없음";

  // TODO: Liveblocks RoomProvider 추가 예정
  // const roomId = `note-${noteId}`;

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* Left Sidebar - Server Component */}
      <NoteSidebar />

      {/*
        TODO: Liveblocks RoomProvider로 래핑
        <RoomProvider id={roomId}>
          ...
        </RoomProvider>
      */}

      {/* Data Loader - Client Component (TanStack Query + AutoSave) */}
      <NoteDataLoader noteId={noteId}>
        {/* Main Layout Wrapper - Client Component (isExpanded Status Management) */}
        <NoteLayoutWrapper>
          {/* Main Content Area - Client Component */}
          {/* TODO: Educator 전용 실시간 Canvas 컴포넌트로 교체 */}
          <NoteContentArea noteId={noteId} noteTitle={noteTitle} />

          {/* Right Side Panel - Client Component */}
          {/* TODO: Liveblocks 기반 실시간 협업 패널로 교체 */}
          <RightSidePanel noteId={noteId} />

          {/* Right Sidebar Icon (When closed When) - Client Component */}
          <SidebarIcons noteId={noteId} />
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );
}

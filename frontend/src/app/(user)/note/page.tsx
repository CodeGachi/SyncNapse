import { NoteSidebar } from "@/components/note/layout/note-sidebar";
import { NoteContentArea } from "@/components/note/layout/note-content-area";
import { RightSidePanel } from "@/components/note/layout/right-side-panel";
import { SidebarIcons } from "@/components/note/layout/sidebar-icons";
import { NoteDataLoader } from "@/components/note/layout/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/layout/note-layout-wrapper";

interface NotePageProps {
  searchParams: {
    id?: string;
    title?: string;
  };
}

/**
 * 노트 페이지 - Server Component
 * 전체 레이아웃 구조를 담당하고, 인터랙티브한 부분은 각 Client Component에 위임
 */
export default function NotePage({ searchParams }: NotePageProps) {
  const noteId = searchParams.id || null;
  const noteTitle = searchParams.title || "제목 없음";

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* 좌측 사이드바 - Server Component */}
      <NoteSidebar />

      {/* 데이터 로더 - Client Component (TanStack Query + 자동저장) */}
      <NoteDataLoader noteId={noteId}>
        {/* 메인 레이아웃 래퍼 - Client Component (isExpanded 상태 관리) */}
        <NoteLayoutWrapper>
          {/* 메인 콘텐츠 영역 - Client Component */}
          <NoteContentArea noteTitle={noteTitle} />

          {/* 우측 사이드 패널 - Client Component */}
          <RightSidePanel />

          {/* 우측 사이드바 아이콘 (닫혀있을 때) - Client Component */}
          <SidebarIcons />
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );
}

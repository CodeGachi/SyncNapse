import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteHeader } from "@/components/note/note-structure/note-header";

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

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* Header - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
        isEducatorNote={false}
      />

      {/* Data Loader - Client Component (파일 목록 로드 + 노트 검증) */}
      <NoteDataLoader noteId={noteId}>
        {/* Main Layout - 뷰어 + 패널 + 아이콘 Flexbox 배치 */}
        <main className="flex-1 h-full">
          <div className="flex gap-1 h-full pt-20 px-2 pb-4">
            {/* Main Content Area - PDF 뷰어 + BlockNote 에디터 */}
            <NoteContentArea noteId={noteId} noteTitle={noteTitle} />

            {/* Right Side Panel - 스크립트, 파일, etc */}
            <RightSidePanel noteId={noteId} isEducator={false} />

            {/* Right Sidebar Icons - 패널 닫혔을 때 */}
            <SidebarIcons noteId={noteId} isEducator={false} />
          </div>
        </main>
      </NoteDataLoader>
    </div>
  );
}

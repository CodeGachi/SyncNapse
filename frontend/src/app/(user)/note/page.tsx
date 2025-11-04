import { NoteSidebar } from "@/components/note/note-structure/note-sidebar";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/note-structure/note-layout-wrapper";

interface NotePageProps {
  searchParams: {
    id?: string;
    title?: string;
  };
}

export default function NotePage({ searchParams }: NotePageProps) {
  const noteId = searchParams.id || null;
  const noteTitle = searchParams.title || "제목 없음";

  return (
    <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
      {/* Left Sidebar - Server Component */}
      <NoteSidebar />

      {/* Data Loader - Client Component (TanStack Query + AutoSave) */}
      <NoteDataLoader noteId={noteId}>
        {/* Main Layout Wrapper - Client Component (isExpanded Status Management) */}
        <NoteLayoutWrapper>
          {/* Main Content Area - Client Component */}
          <NoteContentArea noteId={noteId} noteTitle={noteTitle} />

          {/* Right Side Panel - Client Component */}
          <RightSidePanel />

          {/* Right Sidebar Icon (When closed When) - Client Component */}
          <SidebarIcons />
        </NoteLayoutWrapper>
      </NoteDataLoader>
    </div>
  );
}

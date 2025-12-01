import { StudentNoteContent } from "@/components/note/student-note-content";

interface StudentNotePageProps {
  params: { noteId: string };
  searchParams: { title?: string; t?: string };
}

export default function StudentNotePage({
  params,
  searchParams,
}: StudentNotePageProps) {
  return (
    <StudentNoteContent
      noteId={params.noteId}
      noteTitle={searchParams.title || "제목 없음"}
      seekTime={searchParams.t ? parseFloat(searchParams.t) : null}
    />
  );
}

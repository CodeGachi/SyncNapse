import { EducatorNoteContent } from "@/components/note/educator-note-content";

interface EducatorNotePageProps {
  params: { noteId: string };
  searchParams: {
    title?: string;
    view?: string;   // 공유 링크: "shared"
    token?: string;  // 공유 토큰
  };
}

export default function EducatorNotePage({
  params,
  searchParams,
}: EducatorNotePageProps) {
  // 공유 링크로 접속한 학생인지 확인
  const isSharedView = searchParams.view === "shared" && !!searchParams.token;

  return (
    <EducatorNoteContent
      noteId={params.noteId}
      noteTitle={searchParams.title || "제목 없음"}
      isSharedView={isSharedView}
    />
  );
}

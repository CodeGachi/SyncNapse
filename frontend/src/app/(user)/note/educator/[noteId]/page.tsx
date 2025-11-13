/**
 * Educator 노트 페이지 (Server Component)
 *
 * URL 파라미터를 추출하여 클라이언트 컴포넌트에 전달
 */

import { EducatorNoteClient } from "@/components/note/note-structure/educator-note-client";

interface EducatorNotePageProps {
  params: {
    noteId: string;
  };
  searchParams: {
    title?: string;
    join?: string;
    view?: string;
    token?: string;
  };
}

export default function EducatorNotePage({ params, searchParams }: EducatorNotePageProps) {
  const { noteId } = params;
  const noteTitle = searchParams.title || "제목 없음";
  const joinToken = searchParams.join || null;
  const viewMode = searchParams.view || null;
  const shareToken = searchParams.token || null;

  return (
    <EducatorNoteClient
      noteId={noteId}
      noteTitle={noteTitle}
      joinToken={joinToken}
      viewMode={viewMode}
      shareToken={shareToken}
    />
  );
}

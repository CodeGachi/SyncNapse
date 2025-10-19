/**
 * 노트 페이지 (서버 컴포넌트)
 */

import { NotePageClient } from "@/components/note/note-page-client";

interface NotePageProps {
  searchParams: {
    id?: string;
    title?: string;
  };
}

export default function NotePage({ searchParams }: NotePageProps) {
  // 서버 컴포넌트에서는 단순히 파라미터만 전달
  // 실제 데이터 로딩은 클라이언트에서 수행
  const noteId = searchParams.id || null;
  const noteTitle = searchParams.title || null;

  return <NotePageClient noteId={noteId} noteTitle={noteTitle} />;
}

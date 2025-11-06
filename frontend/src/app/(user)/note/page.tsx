import { redirect } from "next/navigation";

interface NotePageProps {
  searchParams: {
    id?: string;
    title?: string;
    type?: "student" | "educator";
  };
}

/**
 * 레거시 노트 페이지 리다이렉션
 *
 * /note?id=xxx&type=student → /note/student/xxx
 * /note?id=xxx&type=educator → /note/educator/xxx
 *
 * type이 없으면 기본값은 student
 */
export default function NotePage({ searchParams }: NotePageProps) {
  const noteId = searchParams.id;
  const noteType = searchParams.type || "student";
  const noteTitle = searchParams.title;

  // noteId가 없으면 대시보드로 리다이렉트
  if (!noteId) {
    redirect("/dashboard/main");
  }

  // 노트 타입에 따라 적절한 페이지로 리다이렉트
  const targetUrl =
    noteType === "educator"
      ? `/note/educator/${noteId}`
      : `/note/student/${noteId}`;

  // 제목이 있으면 쿼리 파라미터로 전달
  const urlWithTitle = noteTitle
    ? `${targetUrl}?title=${encodeURIComponent(noteTitle)}`
    : targetUrl;

  redirect(urlWithTitle);
}

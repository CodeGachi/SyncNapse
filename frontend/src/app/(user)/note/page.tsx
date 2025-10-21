/**
 * Note Page (Server Component)
 */

import { NotePageClient } from "@/components/note/note-page-client";

interface NotePageProps {
  searchParams: {
    id?: string;
    title?: string;
  };
}

export default function NotePage({ searchParams }: NotePageProps) {
  // Server component simply passes parameters
  // Actual data loading happens on the client
  const noteId = searchParams.id || null;
  const noteTitle = searchParams.title || null;

  return <NotePageClient noteId={noteId} noteTitle={noteTitle} />;
}

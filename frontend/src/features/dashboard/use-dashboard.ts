/**
 * Dashboard feature hook
 */

"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useCreateNote } from "@/lib/api/mutations/notes.mutations";
import type { NoteData } from "@/lib/types";

export function useDashboard() {
  const router = useRouter();

  const { data: notes = [], isLoading, error } = useNotes();

  const createNote = useCreateNote({
    onSuccess: (newNote) => {
      console.log("노트 생성 성공:", newNote);
      router.push(`/note?id=${newNote.id}`);
    },
    onError: (error) => {
      console.error("노트 생성 실패:", error);
      alert("노트 생성에 실패했습니다.");
    },
  });

  const handleCreateNote = (noteData: NoteData) => {
    console.log("노트 생성:", noteData);
    createNote.mutate(noteData);
  };

  const handleNoteClick = (noteId: string) => {
    router.push(`/note?id=${noteId}`);
  };

  return {
    // 노트 목록
    notes,
    isLoading,
    error,

    // 노트 생성
    handleCreateNote,
    isCreating: createNote.isPending,

    // 네비게이션
    handleNoteClick,
  };
}

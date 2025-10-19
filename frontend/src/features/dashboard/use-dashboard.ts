/**
 * Dashboard feature hook
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NoteData } from "@/lib/types";
import { createNote } from "@/lib/note-storage";

export function useDashboard() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateNote = (noteData: NoteData) => {
    console.log("노트 생성:", noteData);

    const newNote = createNote(noteData);

    setIsModalOpen(false);

    router.push(`/note?id=${newNote.id}`);
  };

  const handleNoteClick = (noteId: number, noteTitle?: string) => {
    if (noteTitle) {
      const encodedTitle = encodeURIComponent(noteTitle);
      router.push(`/note?title=${encodedTitle}`);
    } else {
      router.push(`/note`);
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
    handleCreateNote,
  };
}

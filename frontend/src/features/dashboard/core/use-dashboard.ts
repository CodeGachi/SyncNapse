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

  const createNoteMutation = useCreateNote();

  const handleCreateNote = async (noteData: NoteData): Promise<void> => {
    return new Promise((resolve, reject) => {
      createNoteMutation.mutate(
        {
          title: noteData.title,
          folderId: noteData.location || "root",
          files: noteData.files || [],
          type: noteData.type || "student",
        },
        {
          onSuccess: (newNote) => {
            router.push(`/note?id=${newNote.id}`);
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
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
    isCreating: createNoteMutation.isPending,

    // 네비게이션
    handleNoteClick,
  };
}

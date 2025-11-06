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
            // 노트 타입에 따라 적절한 페이지로 이동
            const noteType = newNote.type || "student";
            const path =
              noteType === "educator"
                ? `/note/educator/${newNote.id}`
                : `/note/student/${newNote.id}`;
            router.push(path);
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };

  const handleNoteClick = (noteId: string, noteType: "student" | "educator" = "student") => {
    // 노트 타입에 따라 적절한 페이지로 이동
    const path =
      noteType === "educator"
        ? `/note/educator/${noteId}`
        : `/note/student/${noteId}`;
    router.push(path);
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

/**
 * Question Management Hook
 * Handles question operations in the ETC panel
 */

"use client";

import { useNoteEditorStore } from "@/stores";

export function useQuestionManagement() {
  const { addQuestion, deleteQuestion } = useNoteEditorStore();

  // Question Add
  const handleAddQuestion = (content: string, author: string) => {
    addQuestion(content, author);
    // after Backend API Enabled
  };

  return {
    handleAddQuestion,
    deleteQuestion,
  };
}

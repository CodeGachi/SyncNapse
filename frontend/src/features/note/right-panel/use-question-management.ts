/**
 * Question Management Hook
 * 질문 추가 및 삭제 기능 제공
 */

import { useCallback } from "react";
import { createQuestion, deleteQuestion as deleteQuestionApi } from "@/lib/api/services/questions.api";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";

interface UseQuestionManagementProps {
  noteId: string | null;
}

export function useQuestionManagement({ noteId }: UseQuestionManagementProps = { noteId: null }) {
  const { data: currentUser } = useCurrentUser();

  const handleAddQuestion = useCallback(
    async (content: string) => {
      if (!noteId) {
        console.error("[useQuestionManagement] noteId is required");
        throw new Error("노트 ID가 필요합니다.");
      }

      if (!currentUser) {
        console.error("[useQuestionManagement] User not authenticated");
        throw new Error("로그인이 필요합니다.");
      }

      try {
        await createQuestion(
          noteId,
          content,
          currentUser.id,
          currentUser.name || currentUser.email || "사용자"
        );
        console.log("[useQuestionManagement] Question created successfully");
      } catch (error) {
        console.error("[useQuestionManagement] Failed to create question:", error);
        throw error;
      }
    },
    [noteId, currentUser]
  );

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      if (!noteId) {
        console.error("[useQuestionManagement] noteId is required");
        throw new Error("노트 ID가 필요합니다.");
      }

      try {
        await deleteQuestionApi(questionId, noteId);
        console.log("[useQuestionManagement] Question deleted successfully");
      } catch (error) {
        console.error("[useQuestionManagement] Failed to delete question:", error);
        throw error;
      }
    },
    [noteId]
  );

  return {
    handleAddQuestion,
    deleteQuestion,
  };
}


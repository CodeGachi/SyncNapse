/**
 * Questions API Service - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * Q&A 질문 관리:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장
 * 2. Liveblocks Storage에도 실시간 반영 (qa-panel에서 처리)
 * 3. 동기화 큐에 추가하여 백엔드와 동기화
 */

import type { DBQuestion } from "@/lib/db/questions";
import {
  getQuestionsByNote as getQuestionsFromDB,
  createQuestion as createQuestionInDB,
  updateQuestion as updateQuestionInDB,
  deleteQuestion as deleteQuestionInDB,
  toggleQuestionUpvote as toggleUpvoteInDB,
  toggleQuestionPin as togglePinInDB,
  toggleQuestionShare as toggleShareInDB,
  addAnswerToQuestion as addAnswerInDB,
  deleteAnswerFromQuestion as deleteAnswerInDB,
  markAnswerAsBest as markAnswerAsBestInDB,
} from "@/lib/db/questions";
import { useSyncStore } from "@/lib/sync/sync-store";

/**
 * 특정 노트의 모든 질문 가져오기
 */
export async function fetchQuestionsByNote(
  noteId: string
): Promise<DBQuestion[]> {
  const dbQuestions = await getQuestionsFromDB(noteId);
  return dbQuestions;
}

/**
 * 질문 생성
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function createQuestion(
  noteId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<DBQuestion> {
  // 1. IndexedDB에 즉시 저장
  const question = await createQuestionInDB(
    noteId,
    content,
    authorId,
    authorName
  );

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "question",
    entityId: question.id,
    operation: "create",
    data: {
      note_id: noteId,
      content,
      author_id: authorId,
      author_name: authorName,
      created_at: new Date(question.createdAt).toISOString(),
      updated_at: new Date(question.updatedAt).toISOString(),
      answers: [],
      upvotes: [],
      is_pinned: false,
      is_shared_to_all: false,
    },
  });

  return question;
}

/**
 * 질문 수정
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function updateQuestion(
  questionId: string,
  noteId: string,
  updates: Partial<Omit<DBQuestion, "id" | "noteId" | "createdAt">>
): Promise<void> {
  // 1. IndexedDB에 즉시 저장
  await updateQuestionInDB(questionId, updates);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "question",
    entityId: questionId,
    operation: "update",
    data: {
      note_id: noteId,
      ...updates,
      ...(updates.upvotes && { upvotes: updates.upvotes }),
      ...(updates.isPinned !== undefined && { is_pinned: updates.isPinned }),
      ...(updates.isSharedToAll !== undefined && {
        is_shared_to_all: updates.isSharedToAll,
      }),
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * 질문 삭제
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 */
export async function deleteQuestion(
  questionId: string,
  noteId: string
): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  await deleteQuestionInDB(questionId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "question",
    entityId: questionId,
    operation: "delete",
    data: {
      note_id: noteId,
    },
  });
}

/**
 * 질문 추천/추천 취소
 * - IndexedDB에 즉시 반영
 * - 동기화 큐에 추가
 */
export async function toggleQuestionUpvote(
  questionId: string,
  noteId: string,
  userId: string
): Promise<void> {
  // 1. IndexedDB에 즉시 반영
  await toggleUpvoteInDB(questionId, userId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "question",
    entityId: questionId,
    operation: "update",
    data: {
      note_id: noteId,
      action: "toggle_upvote",
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * 질문 핀 고정/해제
 * - IndexedDB에 즉시 반영
 * - 동기화 큐에 추가
 */
export async function toggleQuestionPin(
  questionId: string,
  noteId: string
): Promise<void> {
  // 1. IndexedDB에 즉시 반영
  await togglePinInDB(questionId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "question",
    entityId: questionId,
    operation: "update",
    data: {
      note_id: noteId,
      action: "toggle_pin",
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * 질문 공유 설정 토글
 * - IndexedDB에 즉시 반영
 * - 동기화 큐에 추가
 */
export async function toggleQuestionShare(
  questionId: string,
  noteId: string
): Promise<void> {
  // 1. IndexedDB에 즉시 반영
  await toggleShareInDB(questionId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "question",
    entityId: questionId,
    operation: "update",
    data: {
      note_id: noteId,
      action: "toggle_share",
      updated_at: new Date().toISOString(),
    },
  });
}

/**
 * 질문에 답변 추가
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function addAnswer(
  questionId: string,
  noteId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<{ id: string; content: string; authorId: string; authorName: string; createdAt: number; isBest: boolean }> {
  // 1. IndexedDB에 즉시 저장
  const answer = await addAnswerInDB(questionId, content, authorId, authorName);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "answer",
    entityId: answer.id,
    operation: "create",
    data: {
      question_id: questionId,
      note_id: noteId,
      content,
      author_id: authorId,
      author_name: authorName,
      created_at: new Date(answer.createdAt).toISOString(),
      is_best: false,
    },
  });

  return answer;
}

/**
 * 질문에서 답변 삭제
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 */
export async function deleteAnswer(
  questionId: string,
  noteId: string,
  answerId: string
): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  await deleteAnswerInDB(questionId, answerId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "answer",
    entityId: answerId,
    operation: "delete",
    data: {
      question_id: questionId,
      note_id: noteId,
    },
  });
}

/**
 * 답변을 베스트 답변으로 표시
 * - IndexedDB에 즉시 반영
 * - 동기화 큐에 추가
 */
export async function markAnswerAsBest(
  questionId: string,
  noteId: string,
  answerId: string
): Promise<void> {
  // 1. IndexedDB에 즉시 반영
  await markAnswerAsBestInDB(questionId, answerId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "answer",
    entityId: answerId,
    operation: "update",
    data: {
      question_id: questionId,
      note_id: noteId,
      action: "mark_as_best",
      updated_at: new Date().toISOString(),
    },
  });
}

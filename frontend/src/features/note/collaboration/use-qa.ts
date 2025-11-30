/**
 * Q&A 기능 훅 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 질문/답변 기능 제공
 * - 모든 참여자가 질문 가능
 * - 추천 기능
 * - Educator는 핀 고정/공유 가능
 */

import { useEffect } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import * as questionsApi from "@/lib/api/services/questions.api";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useQA");

/** 답변 데이터 타입 */
export interface QAAnswer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  isBest: boolean;
}

/** 질문 데이터 타입 */
export interface QAQuestion {
  id: string;
  noteId?: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  answers: QAAnswer[];
  upvotes: string[];
  isPinned: boolean;
  isSharedToAll: boolean;
}

interface UseQAProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
}

interface UseQAReturn {
  /** 전체 질문 목록 */
  questions: readonly QAQuestion[];
  /** 정렬된 질문 목록 (핀 고정 → 추천 많은 순) */
  sortedQuestions: QAQuestion[];
  /** 질문 추가 */
  handleAddQuestion: (content: string) => Promise<void>;
  /** 질문 추천 */
  handleUpvote: (questionId: string) => Promise<void>;
  /** 핀 고정/해제 (Educator만) */
  handleTogglePin: (questionId: string) => Promise<void>;
  /** 질문 삭제 */
  handleDelete: (questionId: string) => Promise<void>;
  /** 답변 추가 */
  handleAddAnswer: (questionId: string, content: string) => Promise<void>;
  /** 답변 삭제 */
  handleDeleteAnswer: (questionId: string, answerId: string) => Promise<void>;
  /** 베스트 답변 표시 (Educator만) */
  handleMarkAnswerAsBest: (questionId: string, answerId: string) => Promise<void>;
}

/**
 * Q&A 기능 커스텀 훅
 */
export function useQA({
  userId,
  userName,
  noteId,
  isEducator = false,
}: UseQAProps): UseQAReturn {
  // Liveblocks Storage에서 질문 목록 가져오기
  const questions = useStorage((root) => root.questions) || [];
  const broadcast = useBroadcastEvent();

  // 질문 목록 변경 감지 (디버깅용)
  useEffect(() => {
    log.debug("질문 목록 업데이트:", {
      userId,
      userName,
      noteId,
      isEducator,
      questionCount: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        author: q.authorName,
        content: q.content.substring(0, 30) + "...",
      })),
    });
  }, [questions, userId, userName, noteId, isEducator]);

  // 질문 추가 Mutation
  const addQuestion = useMutation(
    ({ storage }, content: string) => {
      log.debug("Storage 접근 시작");
      const questionsStorage = storage.get("questions");
      log.debug("현재 questions 배열:", questionsStorage);
      log.debug("questions 타입:", typeof questionsStorage, Array.isArray(questionsStorage));

      const newQuestion: QAQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        noteId,
        content,
        authorId: userId,
        authorName: userName,
        createdAt: Date.now(),
        answers: [],
        upvotes: [],
        isPinned: false,
        isSharedToAll: false,
      };

      log.debug("새 질문 생성:", newQuestion);
      questionsStorage.push(newQuestion);
      log.debug("질문 추가 후 배열 길이:", questionsStorage.length);
    },
    [noteId, userId, userName]
  );

  // 추천 Mutation
  const upvoteQuestion = useMutation(
    ({ storage }, questionId: string) => {
      const questionsStorage = storage.get("questions");
      const questionIndex = questionsStorage.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questionsStorage.get(questionIndex);
      if (!question) return;

      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questionsStorage.set(questionIndex, {
        ...question,
        upvotes: question.upvotes.includes(userId)
          ? question.upvotes.filter((id) => id !== userId) // 추천 취소
          : [...question.upvotes, userId], // 추천 추가
      });
    },
    [userId]
  );

  // 핀 고정 Mutation (Educator만)
  const togglePin = useMutation(({ storage }, questionId: string) => {
    const questionsStorage = storage.get("questions");
    const questionIndex = questionsStorage.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) return;

    const question = questionsStorage.get(questionIndex);
    if (!question) return;

    // LiveList 중첩 객체 문제: 전체 객체를 새로 만들어 set()으로 교체
    questionsStorage.set(questionIndex, {
      ...question,
      isPinned: !question.isPinned,
    });
  }, []);

  // 삭제 Mutation
  const deleteQuestion = useMutation(({ storage }, questionId: string) => {
    const questionsStorage = storage.get("questions");
    const questionIndex = questionsStorage.findIndex((q) => q.id === questionId);
    if (questionIndex !== -1) {
      questionsStorage.delete(questionIndex);
    }
  }, []);

  // 답변 추가 Mutation
  const addAnswer = useMutation(
    ({ storage }, questionId: string, content: string) => {
      const questionsStorage = storage.get("questions");
      const questionIndex = questionsStorage.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questionsStorage.get(questionIndex);
      if (!question) return;

      const newAnswer: QAAnswer = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        content,
        authorId: userId,
        authorName: userName,
        createdAt: Date.now(),
        isBest: false,
      };

      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questionsStorage.set(questionIndex, {
        ...question,
        answers: [...question.answers, newAnswer],
      });
    },
    [userId, userName]
  );

  // 답변 삭제 Mutation
  const deleteAnswer = useMutation(
    ({ storage }, questionId: string, answerId: string) => {
      const questionsStorage = storage.get("questions");
      const questionIndex = questionsStorage.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questionsStorage.get(questionIndex);
      if (!question) return;

      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questionsStorage.set(questionIndex, {
        ...question,
        answers: question.answers.filter((a) => a.id !== answerId),
      });
    },
    []
  );

  // 베스트 답변 표시 Mutation (Educator만)
  const markAnswerAsBest = useMutation(
    ({ storage }, questionId: string, answerId: string) => {
      const questionsStorage = storage.get("questions");
      const questionIndex = questionsStorage.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questionsStorage.get(questionIndex);
      if (!question) return;

      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questionsStorage.set(questionIndex, {
        ...question,
        answers: question.answers.map((answer) => ({
          ...answer,
          isBest: answer.id === answerId,
        })),
      });
    },
    []
  );

  // 질문 추가 핸들러
  const handleAddQuestion = async (content: string) => {
    if (content.trim()) {
      log.debug("질문 추가 시작:", {
        userId,
        userName,
        noteId,
        content,
        isEducator,
      });

      const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // 1. Liveblocks Storage에 저장 (실시간 협업)
      addQuestion(content);
      log.debug("질문 추가 완료 (Liveblocks Storage)");

      // 2. IndexedDB + 백엔드 동기화 큐에 추가
      try {
        await questionsApi.createQuestion(noteId, content, userId, userName);
        log.debug("질문 백엔드 동기화 큐 추가 완료");
      } catch (error) {
        log.error("백엔드 동기화 실패:", error);
      }

      // 3. Broadcast로 즉시 알림
      broadcast({
        type: "QUESTION_ADDED",
        questionId,
        content,
        authorName: userName,
      });
      log.debug("질문 추가 Broadcast 전송 완료");
    }
  };

  // 추천 핸들러
  const handleUpvote = async (questionId: string) => {
    log.debug("질문 추천:", { questionId, userId });

    // 1. Liveblocks Storage에 저장
    upvoteQuestion(questionId);

    // 2. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.toggleQuestionUpvote(questionId, noteId, userId);
      log.debug("추천 백엔드 동기화 큐 추가 완료");
    } catch (error) {
      log.error("백엔드 동기화 실패:", error);
    }

    // 3. Broadcast로 즉시 알림
    broadcast({
      type: "QUESTION_UPVOTED",
      questionId,
      userId,
    });
    log.debug("추천 Broadcast 전송 완료");
  };

  // 핀 고정/해제 핸들러
  const handleTogglePin = async (questionId: string) => {
    log.debug("핀 고정/해제:", { questionId });

    // 1. Liveblocks Storage
    togglePin(questionId);

    // 2. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.toggleQuestionPin(questionId, noteId);
      log.debug("핀 고정 백엔드 동기화 큐 추가 완료");
    } catch (error) {
      log.error("백엔드 동기화 실패:", error);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (questionId: string) => {
    log.debug("질문 삭제:", { questionId });

    // 1. Liveblocks Storage에서 삭제
    deleteQuestion(questionId);

    // 2. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.deleteQuestion(questionId, noteId);
      log.debug("삭제 백엔드 동기화 큐 추가 완료");
    } catch (error) {
      log.error("백엔드 동기화 실패:", error);
    }

    // 3. Broadcast로 즉시 알림
    broadcast({
      type: "QUESTION_DELETED",
      questionId,
    });
    log.debug("삭제 Broadcast 전송 완료");
  };

  // 답변 추가 핸들러
  const handleAddAnswer = async (questionId: string, content: string) => {
    log.debug("답변 추가:", { questionId, content });

    // 1. Liveblocks Storage에 저장
    addAnswer(questionId, content);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "ANSWER_ADDED",
      questionId,
      answerId: `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      authorName: userName,
    });
    log.debug("답변 추가 Broadcast 전송 완료");

    // 3. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.addAnswer(questionId, noteId, content, userId, userName);
      log.debug("답변 백엔드 동기화 큐 추가 완료");
    } catch (error) {
      log.error("백엔드 동기화 실패:", error);
    }
  };

  // 답변 삭제 핸들러
  const handleDeleteAnswer = async (questionId: string, answerId: string) => {
    log.debug("답변 삭제:", { questionId, answerId });

    // 1. Liveblocks Storage에서 삭제
    deleteAnswer(questionId, answerId);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "ANSWER_DELETED",
      questionId,
      answerId,
    });
    log.debug("답변 삭제 Broadcast 전송 완료");

    // 3. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.deleteAnswer(questionId, noteId, answerId);
      log.debug("답변 삭제 백엔드 동기화 큐 추가 완료");
    } catch (error) {
      log.error("백엔드 동기화 실패:", error);
    }
  };

  // 베스트 답변 표시 핸들러
  const handleMarkAnswerAsBest = async (questionId: string, answerId: string) => {
    log.debug("베스트 답변 표시:", { questionId, answerId });

    // 1. Liveblocks Storage
    markAnswerAsBest(questionId, answerId);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "ANSWER_MARKED_BEST",
      questionId,
      answerId,
    });
    log.debug("베스트 답변 Broadcast 전송 완료");

    // 3. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.markAnswerAsBest(questionId, noteId, answerId);
      log.debug("베스트 답변 백엔드 동기화 큐 추가 완료");
    } catch (error) {
      log.error("백엔드 동기화 실패:", error);
    }
  };

  // 정렬: 핀 고정 → 추천 많은 순
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aUpvotes = a.upvotes?.length || 0;
    const bUpvotes = b.upvotes?.length || 0;
    if (bUpvotes !== aUpvotes) return bUpvotes - aUpvotes;
    return b.createdAt - a.createdAt;
  });

  return {
    questions,
    sortedQuestions,
    handleAddQuestion,
    handleUpvote,
    handleTogglePin,
    handleDelete,
    handleAddAnswer,
    handleDeleteAnswer,
    handleMarkAnswerAsBest,
  };
}

/** Q&A 이벤트 리스너 훅 */
export function useQAEventListener(
  isEducator: boolean,
  callbacks: {
    onQuestionAdded?: (authorName: string, content: string) => void;
    onQuestionUpvoted?: (questionId: string) => void;
    onQuestionDeleted?: (questionId: string) => void;
  }
) {
  useEventListener(({ event }) => {
    if (event.type === "QUESTION_ADDED") {
      log.debug("새 질문 추가됨:", event.content);
      // Educator에게만 알림
      if (isEducator && callbacks.onQuestionAdded) {
        callbacks.onQuestionAdded(event.authorName as string, event.content as string);
      }
    } else if (event.type === "QUESTION_UPVOTED") {
      log.debug("질문 추천:", event.questionId);
      if (callbacks.onQuestionUpvoted) {
        callbacks.onQuestionUpvoted(event.questionId as string);
      }
    } else if (event.type === "QUESTION_DELETED") {
      log.debug("질문 삭제:", event.questionId);
      if (callbacks.onQuestionDeleted) {
        callbacks.onQuestionDeleted(event.questionId as string);
      }
    }
  });
}

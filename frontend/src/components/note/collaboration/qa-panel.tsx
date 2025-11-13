/**
 * Q&A 패널 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 질문/답변 기능
 * - 모든 참여자가 질문 가능
 * - 추천 기능
 * - Educator는 핀 고정/공유 가능
 */

"use client";

import { useState, useEffect } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { ThumbsUp, Pin, Trash2, MessageCircle } from "lucide-react";
import * as questionsApi from "@/lib/api/services/questions.api";

/**
 * Liveblocks Storage에서 사용하는 Question 인터페이스
 */
interface StorageAnswer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  isBest: boolean;
}

interface StorageQuestion {
  id: string;
  noteId?: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  answers: StorageAnswer[];
  upvotes: string[];
  isPinned: boolean;
  isSharedToAll: boolean;
}

interface QAPanelProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
}

export function QAPanel({
  userId,
  userName,
  noteId,
  isEducator = false,
}: QAPanelProps) {
  const [newQuestionText, setNewQuestionText] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Liveblocks Storage에서 질문 목록 가져오기
  const questions = useStorage((root) => root.questions) || [];

  // Broadcast 이벤트
  const broadcast = useBroadcastEvent();

  // 질문 목록 변경 감지 (디버깅용)
  useEffect(() => {
    console.log(`[Q&A Panel] 질문 목록 업데이트:`, {
      userId,
      userName,
      noteId,
      isEducator,
      questionCount: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        author: q.authorName,
        content: q.content.substring(0, 30) + '...',
      })),
    });
  }, [questions, userId, userName, noteId, isEducator]);

  // Q&A 이벤트 리스너
  useEventListener(({ event }) => {
    if (event.type === "QUESTION_ADDED") {
      console.log(`[Q&A Panel] 새 질문 추가됨:`, event.content);
      // Educator에게만 알림
      if (isEducator) {
        setToastMessage(`${event.authorName}님이 질문했습니다: ${event.content.substring(0, 30)}...`);
        setShowToast(true);
      }
    } else if (event.type === "QUESTION_UPVOTED") {
      console.log(`[Q&A Panel] 질문 추천:`, event.questionId);
      // 조용히 로그만
    } else if (event.type === "QUESTION_DELETED") {
      console.log(`[Q&A Panel] 질문 삭제:`, event.questionId);
      // 조용히 로그만
    }
  });

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // 질문 추가 Mutation
  const addQuestion = useMutation(({ storage }, content: string) => {
    console.log(`[Q&A Mutation] Storage 접근 시작`);
    const questions = storage.get("questions");
    console.log(`[Q&A Mutation] 현재 questions 배열:`, questions);
    console.log(`[Q&A Mutation] questions 타입:`, typeof questions, Array.isArray(questions));

    const newQuestion = {
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

    console.log(`[Q&A Mutation] 새 질문 생성:`, newQuestion);
    questions.push(newQuestion);
    console.log(`[Q&A Mutation] 질문 추가 후 배열 길이:`, questions.length);
  }, [noteId, userId, userName]);

  // 추천 Mutation
  const upvoteQuestion = useMutation(
    ({ storage }, questionId: string) => {
      const questions = storage.get("questions");
      const questionIndex = questions.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questions.get(questionIndex);
      if (!question) return;
      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questions.set(questionIndex, {
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
    const questions = storage.get("questions");
    const questionIndex = questions.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) return;

    const question = questions.get(questionIndex);
    if (!question) return;
    // LiveList 중첩 객체 문제: 전체 객체를 새로 만들어 set()으로 교체
    questions.set(questionIndex, {
      ...question,
      isPinned: !question.isPinned,
    });
  }, []);

  // 삭제 Mutation
  const deleteQuestion = useMutation(
    ({ storage }, questionId: string) => {
      const questions = storage.get("questions");
      const questionIndex = questions.findIndex((q) => q.id === questionId);
      if (questionIndex !== -1) {
        questions.delete(questionIndex);
      }
    },
    []
  );

  // 답변 추가 Mutation
  const addAnswer = useMutation(
    ({ storage }, questionId: string, content: string) => {
      const questions = storage.get("questions");
      const questionIndex = questions.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questions.get(questionIndex);
      if (!question) return;
      const newAnswer = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        content,
        authorId: userId,
        authorName: userName,
        createdAt: Date.now(),
        isBest: false,
      };

      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questions.set(questionIndex, {
        ...question,
        answers: [...question.answers, newAnswer],
      });
    },
    [userId, userName]
  );

  // 답변 삭제 Mutation
  const deleteAnswer = useMutation(
    ({ storage }, questionId: string, answerId: string) => {
      const questions = storage.get("questions");
      const questionIndex = questions.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questions.get(questionIndex);
      if (!question) return;
      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questions.set(questionIndex, {
        ...question,
        answers: question.answers.filter((a) => a.id !== answerId),
      });
    },
    []
  );

  // 베스트 답변 표시 Mutation (Educator만)
  const markAnswerAsBest = useMutation(
    ({ storage }, questionId: string, answerId: string) => {
      const questions = storage.get("questions");
      const questionIndex = questions.findIndex((q) => q.id === questionId);
      if (questionIndex === -1) return;

      const question = questions.get(questionIndex);
      if (!question) return;
      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      questions.set(questionIndex, {
        ...question,
        answers: question.answers.map((answer) => ({
          ...answer,
          isBest: answer.id === answerId,
        })),
      });
    },
    []
  );

  const handleAddQuestion = async () => {
    if (newQuestionText.trim()) {
      console.log(`[Q&A Panel] 질문 추가 시작:`, {
        userId,
        userName,
        noteId,
        content: newQuestionText,
        isEducator,
      });

      const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // 1. Liveblocks Storage에 저장 (실시간 협업)
      addQuestion(newQuestionText);
      console.log(`[Q&A Panel] 질문 추가 완료 (Liveblocks Storage)`);

      // 2. IndexedDB + 백엔드 동기화 큐에 추가
      try {
        await questionsApi.createQuestion(noteId, newQuestionText, userId, userName);
        console.log(`[Q&A Panel] 질문 백엔드 동기화 큐 추가 완료`);
      } catch (error) {
        console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
      }

      // 3. Broadcast로 즉시 알림
      broadcast({
        type: "QUESTION_ADDED",
        questionId,
        content: newQuestionText,
        authorName: userName,
      });
      console.log(`[Q&A Panel] 질문 추가 Broadcast 전송 완료`);

      setNewQuestionText("");
    }
  };

  // 추천 (Storage + Broadcast + Backend)
  const handleUpvote = async (questionId: string) => {
    console.log(`[Q&A Panel] 질문 추천:`, { questionId, userId });

    // 1. Liveblocks Storage에 저장
    upvoteQuestion(questionId);

    // 2. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.toggleQuestionUpvote(questionId, noteId, userId);
      console.log(`[Q&A Panel] 추천 백엔드 동기화 큐 추가 완료`);
    } catch (error) {
      console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
    }

    // 3. Broadcast로 즉시 알림
    broadcast({
      type: "QUESTION_UPVOTED",
      questionId,
      userId,
    });
    console.log(`[Q&A Panel] 추천 Broadcast 전송 완료`);
  };

  // 핀 고정/해제 (Storage + Backend)
  const handleTogglePin = async (questionId: string) => {
    console.log(`[Q&A Panel] 핀 고정/해제:`, { questionId });

    // 1. Liveblocks Storage
    togglePin(questionId);

    // 2. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.toggleQuestionPin(questionId, noteId);
      console.log(`[Q&A Panel] 핀 고정 백엔드 동기화 큐 추가 완료`);
    } catch (error) {
      console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
    }
  };

  // 삭제 (Storage + Broadcast + Backend)
  const handleDelete = async (questionId: string) => {
    console.log(`[Q&A Panel] 질문 삭제:`, { questionId });

    // 1. Liveblocks Storage에서 삭제
    deleteQuestion(questionId);

    // 2. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.deleteQuestion(questionId, noteId);
      console.log(`[Q&A Panel] 삭제 백엔드 동기화 큐 추가 완료`);
    } catch (error) {
      console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
    }

    // 3. Broadcast로 즉시 알림
    broadcast({
      type: "QUESTION_DELETED",
      questionId,
    });
    console.log(`[Q&A Panel] 삭제 Broadcast 전송 완료`);
  };

  // 답변 추가 (Storage + Backend + Broadcast)
  const handleAddAnswer = async (questionId: string, content: string) => {
    console.log(`[Q&A Panel] 답변 추가:`, { questionId, content });

    // 1. Liveblocks Storage에 저장
    addAnswer(questionId, content);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "ANSWER_ADDED",
      questionId,
      answerId: `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      authorName: userName,
    });
    console.log(`[Q&A Panel] 답변 추가 Broadcast 전송 완료`);

    // 3. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.addAnswer(questionId, noteId, content, userId, userName);
      console.log(`[Q&A Panel] 답변 백엔드 동기화 큐 추가 완료`);
    } catch (error) {
      console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
    }
  };

  // 답변 삭제 (Storage + Backend + Broadcast)
  const handleDeleteAnswer = async (questionId: string, answerId: string) => {
    console.log(`[Q&A Panel] 답변 삭제:`, { questionId, answerId });

    // 1. Liveblocks Storage에서 삭제
    deleteAnswer(questionId, answerId);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "ANSWER_DELETED",
      questionId,
      answerId,
    });
    console.log(`[Q&A Panel] 답변 삭제 Broadcast 전송 완료`);

    // 3. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.deleteAnswer(questionId, noteId, answerId);
      console.log(`[Q&A Panel] 답변 삭제 백엔드 동기화 큐 추가 완료`);
    } catch (error) {
      console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
    }
  };

  // 베스트 답변 표시 (Storage + Backend + Broadcast) - Educator만
  const handleMarkAnswerAsBest = async (questionId: string, answerId: string) => {
    console.log(`[Q&A Panel] 베스트 답변 표시:`, { questionId, answerId });

    // 1. Liveblocks Storage
    markAnswerAsBest(questionId, answerId);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "ANSWER_MARKED_BEST",
      questionId,
      answerId,
    });
    console.log(`[Q&A Panel] 베스트 답변 Broadcast 전송 완료`);

    // 3. IndexedDB + 백엔드 동기화
    try {
      await questionsApi.markAnswerAsBest(questionId, noteId, answerId);
      console.log(`[Q&A Panel] 베스트 답변 백엔드 동기화 큐 추가 완료`);
    } catch (error) {
      console.error(`[Q&A Panel] 백엔드 동기화 실패:`, error);
    }
  };

  // 정렬: 핀 고정 → 추천 많은 순
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aUpvotes = (a.upvotes?.length || 0);
    const bUpvotes = (b.upvotes?.length || 0);
    if (bUpvotes !== aUpvotes) return bUpvotes - aUpvotes;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#AFC02B] text-black px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
          {toastMessage}
        </div>
      )}

      {/* 질문 작성 폼 */}
      <div className="border-b border-white/20 pb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddQuestion()}
            placeholder="질문을 입력하세요..."
            className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B]"
          />
          <button
            onClick={handleAddQuestion}
            disabled={!newQuestionText.trim()}
            className="px-3 py-2 bg-[#AFC02B] text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#AFC02B]/90 transition-colors text-sm"
          >
            질문
          </button>
        </div>
      </div>

      {/* 질문 목록 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sortedQuestions.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm flex flex-col items-center gap-2">
            <MessageCircle size={32} />
            <p>아직 질문이 없습니다</p>
            <p className="text-xs">첫 질문을 작성해보세요!</p>
          </div>
        ) : (
          sortedQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              currentUserId={userId}
              currentUserName={userName}
              isEducator={isEducator}
              onUpvote={() => handleUpvote(question.id)}
              onTogglePin={() => handleTogglePin(question.id)}
              onDelete={() => handleDelete(question.id)}
              onAddAnswer={(content) => handleAddAnswer(question.id, content)}
              onDeleteAnswer={(answerId) => handleDeleteAnswer(question.id, answerId)}
              onMarkAnswerAsBest={(answerId) => handleMarkAnswerAsBest(question.id, answerId)}
            />
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * 개별 질문 카드
 */
interface QuestionCardProps {
  question: StorageQuestion;
  currentUserId: string;
  currentUserName: string;
  isEducator: boolean;
  onUpvote: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onAddAnswer: (content: string) => void;
  onDeleteAnswer: (answerId: string) => void;
  onMarkAnswerAsBest: (answerId: string) => void;
}

function QuestionCard({
  question,
  currentUserId,
  currentUserName,
  isEducator,
  onUpvote,
  onTogglePin,
  onDelete,
  onAddAnswer,
  onDeleteAnswer,
  onMarkAnswerAsBest,
}: QuestionCardProps) {
  const isUpvoted = question.upvotes?.includes(currentUserId) || false;
  const isMyQuestion = question.authorId === currentUserId;

  // 답변 상태
  const [showAnswers, setShowAnswers] = useState(false);
  const [newAnswerText, setNewAnswerText] = useState("");

  // 답변 추가 핸들러
  const handleSubmitAnswer = () => {
    if (newAnswerText.trim()) {
      onAddAnswer(newAnswerText);
      setNewAnswerText("");
    }
  };

  return (
    <div
      className={`bg-white/5 rounded-lg p-3 border transition-colors ${
        question.isPinned
          ? "border-yellow-400/50 bg-yellow-400/5"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-xs font-medium">
              {question.authorName}
              {isMyQuestion && (
                <span className="text-[#AFC02B] ml-1">(나)</span>
              )}
            </span>
            <span className="text-white/40 text-xs">
              {new Date(question.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-white text-sm break-words">{question.content}</p>
        </div>

        {/* 배지 */}
        {question.isPinned && (
          <div className="bg-yellow-400/20 text-yellow-400 rounded px-1.5 py-0.5 text-xs font-medium flex-shrink-0">
            고정
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
        {/* 추천 */}
        <button
          onClick={onUpvote}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            isUpvoted
              ? "bg-blue-500/20 text-blue-400"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          <ThumbsUp size={12} className={isUpvoted ? "fill-blue-400" : ""} />
          <span>{question.upvotes?.length || 0}</span>
        </button>

        {/* Educator 전용 버튼 */}
        {isEducator && (
          <button
            onClick={onTogglePin}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              question.isPinned
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            title="고정"
          >
            <Pin size={12} />
          </button>
        )}

        {/* 삭제 (본인 또는 Educator) */}
        {(isMyQuestion || isEducator) && (
          <button
            onClick={onDelete}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white/5 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="삭제"
          >
            <Trash2 size={12} />
          </button>
        )}

        {/* 답변 토글 버튼 */}
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <MessageCircle size={12} />
          <span>{question.answers?.length || 0}</span>
        </button>
      </div>

      {/* 답변 섹션 */}
      {showAnswers && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {/* 답변 목록 */}
          {question.answers && question.answers.length > 0 && (
            <div className="space-y-2">
              {question.answers.map((answer) => {
                const isMyAnswer = answer.authorId === currentUserId;
                return (
                  <div
                    key={answer.id}
                    className={`bg-white/5 rounded p-2 border ${
                      answer.isBest
                        ? "border-[#AFC02B]/50 bg-[#AFC02B]/5"
                        : "border-white/10"
                    }`}
                  >
                    {/* 답변 헤더 */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 text-xs font-medium">
                          {answer.authorName}
                          {isMyAnswer && (
                            <span className="text-[#AFC02B] ml-1">(나)</span>
                          )}
                        </span>
                        <span className="text-white/40 text-xs">
                          {new Date(answer.createdAt).toLocaleTimeString(
                            "ko-KR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        {/* 베스트 답변 배지 */}
                        {answer.isBest && (
                          <div className="bg-[#AFC02B]/20 text-[#AFC02B] rounded px-1.5 py-0.5 text-xs font-medium">
                            ✓ 채택
                          </div>
                        )}
                      </div>

                      {/* 답변 액션 버튼 */}
                      <div className="flex gap-1">
                        {/* 베스트 답변 표시 (Educator만, 이미 베스트가 아닐 때만) */}
                        {isEducator && !answer.isBest && (
                          <button
                            onClick={() => onMarkAnswerAsBest(answer.id)}
                            className="px-1.5 py-0.5 rounded text-xs bg-white/5 text-[#AFC02B]/60 hover:bg-[#AFC02B]/20 hover:text-[#AFC02B] transition-colors"
                            title="베스트 답변으로 표시"
                          >
                            채택
                          </button>
                        )}

                        {/* 답변 삭제 (본인 또는 Educator) */}
                        {(isMyAnswer || isEducator) && (
                          <button
                            onClick={() => onDeleteAnswer(answer.id)}
                            className="px-1.5 py-0.5 rounded text-xs bg-white/5 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 답변 내용 */}
                    <p className="text-white/90 text-sm break-words">
                      {answer.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* 답변 입력 폼 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newAnswerText}
              onChange={(e) => setNewAnswerText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
              placeholder="답변을 입력하세요..."
              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B]"
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!newAnswerText.trim()}
              className="px-2 py-1.5 bg-[#AFC02B] text-black rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#AFC02B]/90 transition-colors"
            >
              답변
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

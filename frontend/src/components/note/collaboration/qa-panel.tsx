/**
 * Q&A 패널 (Liveblocks 실시간 버전)
 *
 * UI 컴포넌트 - Q&A 기능의 시각적 표현
 * 비즈니스 로직은 useQA 훅에서 처리
 */

"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, Pin, Trash2, MessageCircle, CheckCircle } from "lucide-react";
import {
  useQA,
  useQAEventListener,
  type QAQuestion,
} from "@/features/note/collaboration/use-qa";

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

  // Q&A 훅 사용
  const {
    sortedQuestions,
    handleAddQuestion,
    handleUpvote,
    handleTogglePin,
    handleDelete,
    handleAddAnswer,
    handleDeleteAnswer,
    handleMarkAnswerAsBest,
  } = useQA({ userId, userName, noteId, isEducator });

  // Q&A 이벤트 리스너
  useQAEventListener(isEducator, {
    onQuestionAdded: (authorName, content) => {
      setToastMessage(`${authorName}님이 질문했습니다: ${content.substring(0, 30)}...`);
      setShowToast(true);
    },
  });

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const onAddQuestion = async () => {
    if (newQuestionText.trim()) {
      await handleAddQuestion(newQuestionText);
      setNewQuestionText("");
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-brand text-black px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
          {toastMessage}
        </div>
      )}

      {/* 질문 작성 폼 */}
      <div className="border-b border-border pb-4 px-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onAddQuestion()}
            placeholder="질문을 입력하세요..."
            className="flex-1 bg-background-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-foreground-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
          <button
            onClick={onAddQuestion}
            disabled={!newQuestionText.trim()}
            className="px-4 py-2 bg-brand text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-hover transition-colors text-sm shadow-sm active:scale-95"
          >
            질문
          </button>
        </div>
      </div>

      {/* 질문 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {sortedQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-foreground-tertiary gap-3">
            <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center">
              <MessageCircle size={28} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1">아직 질문이 없습니다</p>
              <p className="text-xs text-foreground-tertiary">첫 질문을 작성하여 대화를 시작해보세요!</p>
            </div>
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
  question: QAQuestion;
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
      className={`rounded-xl p-4 border transition-all shadow-sm ${question.isPinned
        ? "border-brand/30 bg-brand/5"
        : "border-transparent bg-background-surface hover:border-border"
        }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-bold ${isMyQuestion ? "text-brand" : "text-foreground"}`}>
              {question.authorName}
              {isMyQuestion && <span className="font-normal opacity-80 ml-1">(나)</span>}
            </span>
            <span className="text-foreground-tertiary text-[10px]">
              {new Date(question.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {/* 배지 */}
            {question.isPinned && (
              <div className="flex items-center gap-1 bg-brand/20 text-brand rounded-full px-2 py-0.5 text-[10px] font-bold">
                <Pin size={8} className="fill-current" />
                <span>PINNED</span>
              </div>
            )}
          </div>
          <p className="text-foreground-secondary text-sm leading-relaxed break-words">{question.content}</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
        {/* 추천 */}
        <button
          onClick={onUpvote}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isUpvoted
            ? "bg-brand/20 text-brand"
            : "bg-background-elevated text-foreground-secondary hover:bg-background-overlay hover:text-foreground"
            }`}
        >
          <ThumbsUp size={12} className={isUpvoted ? "fill-current" : ""} />
          <span>{question.upvotes?.length || 0}</span>
        </button>

        {/* 답변 토글 버튼 */}
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${showAnswers || (question.answers?.length || 0) > 0
            ? "bg-background-elevated text-foreground"
            : "bg-transparent text-foreground-tertiary hover:bg-background-elevated hover:text-foreground-secondary"
            }`}
        >
          <MessageCircle size={12} />
          <span>{question.answers?.length || 0}</span>
          <span className="ml-1">{showAnswers ? "접기" : "답변"}</span>
        </button>

        <div className="flex-1" />

        {/* Educator 전용 버튼 */}
        {isEducator && (
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded-lg transition-colors ${question.isPinned
              ? "text-brand bg-brand/10"
              : "text-foreground-tertiary hover:text-foreground hover:bg-background-elevated"
              }`}
            title={question.isPinned ? "고정 해제" : "고정"}
          >
            <Pin size={14} className={question.isPinned ? "fill-current" : ""} />
          </button>
        )}

        {/* 삭제 (본인 또는 Educator) */}
        {(isMyQuestion || isEducator) && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-foreground-tertiary hover:text-status-error hover:bg-status-error/10 transition-colors"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* 답변 섹션 */}
      {showAnswers && (
        <div className="mt-3 pt-3 space-y-3 bg-background-base -mx-4 -mb-4 p-4 rounded-b-xl border-t border-border">
          {/* 답변 목록 */}
          {question.answers && question.answers.length > 0 && (
            <div className="space-y-3 mb-4">
              {question.answers.map((answer) => {
                const isMyAnswer = answer.authorId === currentUserId;
                return (
                  <div
                    key={answer.id}
                    className={`rounded-lg p-3 border transition-all ${answer.isBest
                      ? "border-brand/30 bg-brand/5"
                      : "border-border bg-background-elevated"
                      }`}
                  >
                    {/* 답변 헤더 */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isMyAnswer ? "text-brand" : "text-foreground-secondary"}`}>
                          {answer.authorName}
                          {isMyAnswer && <span className="font-normal opacity-80 ml-1">(나)</span>}
                        </span>
                        <span className="text-foreground-tertiary text-[10px]">
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
                          <div className="flex items-center gap-1 bg-brand/20 text-brand rounded px-1.5 py-0.5 text-[10px] font-bold">
                            <CheckCircle size={8} />
                            <span>채택됨</span>
                          </div>
                        )}
                      </div>

                      {/* 답변 액션 버튼 */}
                      <div className="flex gap-1">
                        {/* 베스트 답변 표시 (Educator만, 이미 베스트가 아닐 때만) */}
                        {isEducator && !answer.isBest && (
                          <button
                            onClick={() => onMarkAnswerAsBest(answer.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-background-elevated text-foreground-secondary hover:bg-brand/20 hover:text-brand transition-colors"
                            title="베스트 답변으로 표시"
                          >
                            채택하기
                          </button>
                        )}

                        {/* 답변 삭제 (본인 또는 Educator) */}
                        {(isMyAnswer || isEducator) && (
                          <button
                            onClick={() => onDeleteAnswer(answer.id)}
                            className="p-1 rounded text-foreground-tertiary hover:bg-status-error/10 hover:text-status-error transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 답변 내용 */}
                    <p className="text-foreground-secondary text-sm leading-relaxed break-words">
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
              className="flex-1 bg-background-elevated border border-border rounded-lg px-3 py-2 text-foreground text-xs placeholder:text-foreground-tertiary focus:outline-none focus:border-brand transition-colors"
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!newAnswerText.trim()}
              className="px-3 py-2 bg-background-elevated text-foreground-secondary hover:text-foreground hover:bg-background-overlay rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

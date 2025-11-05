/**
 * Q&A 패널 및 답변 작성 UI
 * 학생들이 질문을 하고 다른 학생들이 답변하는 인터페이스
 */

"use client";

import { useCollaborationStore } from "@/stores/collaboration-store";
import { useCallback, useState } from "react";

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
  const {
    questions,
    addQuestion,
    upvoteQuestion,
    toggleShareQuestion,
    togglePinQuestion,
    deleteQuestion,
  } = useCollaborationStore();

  const [newQuestionText, setNewQuestionText] = useState("");

  const handleAddQuestion = useCallback(() => {
    if (newQuestionText.trim()) {
      addQuestion(noteId, newQuestionText, userId, userName);
      setNewQuestionText("");
    }
  }, [newQuestionText, noteId, userId, userName, addQuestion]);

  // 핀 고정된 질문 먼저, 그 다음 최신 질문
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="flex flex-col gap-3 h-full">
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
          <div className="text-center py-8 text-white/40 text-sm">
            아직 질문이 없습니다
          </div>
        ) : (
          sortedQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              currentUserId={userId}
              isEducator={isEducator}
              onUpvote={() => upvoteQuestion(question.id, userId)}
              onToggleShare={() => toggleShareQuestion(question.id)}
              onTogglePin={() => togglePinQuestion(question.id)}
              onDelete={() => deleteQuestion(question.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 개별 질문 카드
 */
function QuestionCard({
  question,
  currentUserId,
  isEducator,
  onUpvote,
  onToggleShare,
  onTogglePin,
  onDelete,
}: {
  question: any;
  currentUserId: string;
  isEducator: boolean;
  onUpvote: () => void;
  onToggleShare: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const hasUpvoted = question.voters.includes(currentUserId);
  const isAuthor = question.authorId === currentUserId;

  return (
    <div className="bg-white/5 rounded-lg p-3 space-y-2">
      {/* 질문 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {question.isPinned && (
            <div className="text-xs text-[#AFC02B] font-medium mb-1">
              📌 고정됨
            </div>
          )}
          <p className="text-white text-sm font-medium break-words">
            {question.content}
          </p>
          <div className="text-xs text-white/50 mt-1">
            {question.authorName} • {formatTime(Date.now() - question.createdAt)}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-1 flex-shrink-0">
          {isEducator && (
            <>
              {question.isSharedToAll && (
                <div className="text-xs px-2 py-1 bg-[#AFC02B]/20 text-[#AFC02B] rounded">
                  전체 공유
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 질문 액션 바 */}
      <div className="flex items-center gap-2 text-xs">
        {/* 추천 버튼 */}
        <button
          onClick={onUpvote}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            hasUpvoted
              ? "bg-[#AFC02B]/20 text-[#AFC02B]"
              : "bg-white/10 text-white/60 hover:bg-white/20"
          }`}
        >
          <span>👍</span>
          <span>{question.upvotes}</span>
        </button>

        {/* 답변 표시 버튼 */}
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="flex items-center gap-1 px-2 py-1 bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors"
        >
          <span>💬</span>
          <span>{question.answers.length}</span>
        </button>

        {/* 강사용: 전체 공유 토글 */}
        {isEducator && (
          <button
            onClick={onToggleShare}
            className={`px-2 py-1 rounded transition-colors text-xs ${
              question.isSharedToAll
                ? "bg-[#AFC02B]/20 text-[#AFC02B]"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            {question.isSharedToAll ? "✓ 공유" : "공유"}
          </button>
        )}

        {/* 강사용: 고정 토글 */}
        {isEducator && (
          <button
            onClick={onTogglePin}
            className={`px-2 py-1 rounded transition-colors ${
              question.isPinned
                ? "bg-white/10 text-[#AFC02B]"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            📌
          </button>
        )}

        {/* 삭제 버튼 (작성자 또는 강사) */}
        {(isAuthor || isEducator) && (
          <button
            onClick={onDelete}
            className="ml-auto px-2 py-1 rounded bg-white/10 text-white/60 hover:bg-red-600/30 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* 답변 표시 */}
      {showAnswers && question.answers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
          {question.answers.map((answer: any) => (
            <div
              key={answer.id}
              className="bg-white/5 rounded p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {answer.isSelected && (
                    <div className="text-xs text-[#AFC02B] font-medium mb-1">
                      ✓ 최고의 답변
                    </div>
                  )}
                  <p className="text-white/80 text-xs break-words">
                    {answer.content}
                  </p>
                  <div className="text-xs text-white/40 mt-1">
                    {answer.authorName}
                  </div>
                </div>

                {isEducator && !answer.isSelected && (
                  <button
                    onClick={() => {
                      // selectBestAnswer 호출
                    }}
                    className="px-2 py-1 bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors text-xs"
                  >
                    선택
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 답변 작성 모달 (질문 클릭 시)
 */
export function AnswerModal({
  question,
  userId,
  userName,
  isOpen,
  onClose,
  onSubmit,
}: {
  question: any;
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
}) {
  const [answerText, setAnswerText] = useState("");

  const handleSubmit = () => {
    if (answerText.trim()) {
      onSubmit(answerText);
      setAnswerText("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#3C3C3C] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-white font-bold mb-4">질문에 답변하기</h2>

        {/* 원본 질문 표시 */}
        <div className="bg-white/5 rounded p-3 mb-4">
          <div className="text-white/60 text-xs mb-1">질문</div>
          <p className="text-white text-sm">{question.content}</p>
          <div className="text-white/40 text-xs mt-2">{question.authorName}</div>
        </div>

        {/* 답변 입력 */}
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="답변을 입력하세요..."
          className="w-full h-32 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B] resize-none"
        />

        {/* 버튼 */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubmit}
            disabled={!answerText.trim()}
            className="flex-1 py-2 px-4 bg-[#AFC02B] text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#AFC02B]/90 transition-colors"
          >
            답변 제출
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-white/10 text-white rounded font-medium hover:bg-white/20 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초 전`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

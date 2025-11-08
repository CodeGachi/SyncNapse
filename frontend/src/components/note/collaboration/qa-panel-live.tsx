/**
 * Q&A 패널 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 질문/답변 기능
 * - 모든 참여자가 질문 가능
 * - 추천 기능
 * - Educator는 핀 고정/공유 가능
 */

"use client";

import { useState } from "react";
import {
  useStorage,
  useMutation,
} from "@/lib/liveblocks/liveblocks.config";
import { ThumbsUp, Pin, Share2, Trash2, MessageCircle } from "lucide-react";

interface QAPanelLiveProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
}

export function QAPanelLive({
  userId,
  userName,
  isEducator = false,
}: QAPanelLiveProps) {
  const [newQuestionText, setNewQuestionText] = useState("");

  // Liveblocks Storage에서 질문 목록 가져오기
  const questions = useStorage((root) => root.questions) || [];

  // 질문 추가 Mutation
  const addQuestion = useMutation(({ storage }, text: string) => {
    const questions = storage.get("questions");
    const newQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text,
      userId,
      userName,
      createdAt: Date.now(),
      upvotes: [],
      isPinned: false,
      isShared: false,
    };
    questions.push(newQuestion);
  }, []);

  // 추천 Mutation
  const upvoteQuestion = useMutation(
    ({ storage }, questionId: string) => {
      const questions = storage.get("questions");
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      const upvoteIndex = question.upvotes.indexOf(userId);
      if (upvoteIndex === -1) {
        // 추천
        question.upvotes.push(userId);
      } else {
        // 추천 취소
        question.upvotes.splice(upvoteIndex, 1);
      }
    },
    [userId]
  );

  // 핀 고정 Mutation (Educator만)
  const togglePin = useMutation(({ storage }, questionId: string) => {
    const questions = storage.get("questions");
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    question.isPinned = !question.isPinned;
  }, []);

  // 공유 Mutation (Educator만)
  const toggleShare = useMutation(({ storage }, questionId: string) => {
    const questions = storage.get("questions");
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    question.isShared = !question.isShared;
  }, []);

  // 삭제 Mutation
  const deleteQuestion = useMutation(
    ({ storage }, questionId: string) => {
      const questions = storage.get("questions");
      const index = questions.findIndex((q) => q.id === questionId);
      if (index !== -1) {
        questions.delete(index);
      }
    },
    []
  );

  const handleAddQuestion = () => {
    if (newQuestionText.trim()) {
      addQuestion(newQuestionText);
      setNewQuestionText("");
    }
  };

  // 정렬: 핀 고정 → 추천 많은 순
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.upvotes.length !== b.upvotes.length)
      return b.upvotes.length - a.upvotes.length;
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
              isEducator={isEducator}
              onUpvote={() => upvoteQuestion(question.id)}
              onTogglePin={() => togglePin(question.id)}
              onToggleShare={() => toggleShare(question.id)}
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
interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    userId: string;
    userName: string;
    createdAt: number;
    upvotes: string[];
    isPinned: boolean;
    isShared: boolean;
  };
  currentUserId: string;
  isEducator: boolean;
  onUpvote: () => void;
  onTogglePin: () => void;
  onToggleShare: () => void;
  onDelete: () => void;
}

function QuestionCard({
  question,
  currentUserId,
  isEducator,
  onUpvote,
  onTogglePin,
  onToggleShare,
  onDelete,
}: QuestionCardProps) {
  const isUpvoted = question.upvotes.includes(currentUserId);
  const isMyQuestion = question.userId === currentUserId;

  return (
    <div
      className={`bg-white/5 rounded-lg p-3 border transition-colors ${
        question.isPinned
          ? "border-yellow-400/50 bg-yellow-400/5"
          : question.isShared
          ? "border-green-400/50 bg-green-400/5"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-xs font-medium">
              {question.userName}
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
          <p className="text-white text-sm break-words">{question.text}</p>
        </div>

        {/* 배지 */}
        <div className="flex gap-1 flex-shrink-0">
          {question.isPinned && (
            <div className="bg-yellow-400/20 text-yellow-400 rounded px-1.5 py-0.5 text-xs font-medium">
              고정
            </div>
          )}
          {question.isShared && (
            <div className="bg-green-400/20 text-green-400 rounded px-1.5 py-0.5 text-xs font-medium">
              공유
            </div>
          )}
        </div>
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
          <span>{question.upvotes.length}</span>
        </button>

        {/* Educator 전용 버튼 */}
        {isEducator && (
          <>
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
            <button
              onClick={onToggleShare}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                question.isShared
                  ? "bg-green-400/20 text-green-400"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              title="공유"
            >
              <Share2 size={12} />
            </button>
          </>
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
      </div>
    </div>
  );
}

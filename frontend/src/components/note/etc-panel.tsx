/**
 * etc 패널 컴포넌트
 * Exam, Summary, 질문 추가, 질문 리스트 기능
 */

"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";

interface EtcPanelProps {
  isOpen: boolean;
  questions: Question[];
  onAddQuestion: (content: string, author: string) => void;
  onDeleteQuestion?: (id: string) => void;
  currentUser?: { name: string; email: string } | null;
}

export function EtcPanel({
  isOpen,
  questions,
  onAddQuestion,
  onDeleteQuestion,
  currentUser,
}: EtcPanelProps) {
  const [selectedMenu, setSelectedMenu] = useState<"exam" | "summary" | "question" | "questionList" | null>(null);
  const [questionContent, setQuestionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleQuestionSubmit = async () => {
    if (!questionContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const authorName = currentUser?.name || "익명";
      await onAddQuestion(questionContent, authorName);
      setQuestionContent("");
      setSelectedMenu(null);
    } catch (error) {
      console.error("질문 제출 실패:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <div
      className="flex flex-col items-center p-3 gap-2.5 w-full h-[380px] bg-[#2F2F2F] border-2 border-[#AFC02B] rounded-[10px] overflow-hidden transition-all duration-500 ease-out"
      style={{
        animation: isOpen ? "expandPanel 0.5s ease-out forwards" : "none",
      }}
    >
      {/* 헤더 */}
      <div className="flex flex-row justify-center items-center w-full h-[15px] flex-shrink-0">
        <h3 className="font-bold text-xs leading-[15px] text-center text-white">
          etc.
        </h3>
      </div>

      {/* 메뉴가 선택되지 않은 경우 - 메인 버튼들 */}
      {!selectedMenu && (
        <div className="flex flex-col items-center gap-6 w-full flex-shrink-0">
          {/* 상단 버튼 그룹 (Exam, Summary) */}
          <div className="flex flex-row justify-center items-center gap-6 w-full">
            {/* Exam 버튼 */}
            <button
              onClick={() => setSelectedMenu("exam")}
              className="flex flex-col justify-center items-center w-[165px] h-[70px] bg-[#899649] rounded-[24px] hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-base leading-[19px] text-white">
                exam
              </span>
            </button>

            {/* Summary 버튼 */}
            <button
              onClick={() => setSelectedMenu("summary")}
              className="flex flex-col justify-center items-center w-[165px] h-[70px] bg-[#6C4F4F] rounded-[24px] hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-base leading-[19px] text-white">
                summary
              </span>
            </button>
          </div>

          {/* 하단 버튼 그룹 (질문 추가, 질문 리스트) */}
          <div className="flex flex-row justify-center items-center gap-6 w-full">
            {/* 질문 추가 버튼 */}
            <button
              onClick={() => setSelectedMenu("question")}
              className="flex flex-col justify-center items-center w-[165px] h-[70px] bg-[#4F6C6C] rounded-[24px] hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-base leading-[19px] text-white">
                질문 추가
              </span>
            </button>

            {/* 질문 리스트 버튼 */}
            <button
              onClick={() => setSelectedMenu("questionList")}
              className="flex flex-col justify-center items-center w-[165px] h-[70px] bg-[#6C5B4F] rounded-[24px] hover:opacity-80 transition-opacity relative"
            >
              <span className="font-bold text-base leading-[19px] text-white">
                질문 리스트
              </span>
              {questions.length > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {questions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 질문 입력 폼 */}
      {selectedMenu === "question" && (
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-white font-semibold">질문 추가</h4>
            <button
              onClick={() => {
                setSelectedMenu(null);
                setQuestionContent("");
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* 질문 내용 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <label className="block text-xs font-medium text-gray-300 mb-2 flex-shrink-0">
                질문 내용
              </label>
              <textarea
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                placeholder="질문을 입력하세요"
                className="flex-1 px-3 py-2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedMenu(null);
                  setQuestionContent("");
                }}
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleQuestionSubmit}
                disabled={!questionContent.trim() || isSubmitting}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>전송 중...</span>
                  </>
                ) : (
                  <span>추가</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 질문 리스트 */}
      {selectedMenu === "questionList" && (
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold">질문 리스트</h4>
              <span className="text-gray-400 text-sm">({questions.length})</span>
            </div>
            <button
              onClick={() => setSelectedMenu(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* 질문 목록 - 스크롤 가능 */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {questions.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">
                아직 질문이 없습니다
              </p>
            ) : (
              questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-[#2a2a2a] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          question.status === "answered"
                            ? "bg-green-600 text-white"
                            : "bg-yellow-600 text-white"
                        }`}
                      >
                        {question.status === "answered" ? "답변완료" : "대기중"}
                      </span>
                      <span className="text-white text-xs">질문 {index + 1}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {formatTimestamp(question.timestamp)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">작성자: {question.author}</p>
                    <p className="text-sm text-white mt-1">{question.content}</p>
                  </div>
                  {question.answer && (
                    <div className="bg-[#1e1e1e] rounded p-2">
                      <p className="text-xs text-gray-400">답변</p>
                      <p className="text-sm text-white mt-1">{question.answer}</p>
                    </div>
                  )}
                  {onDeleteQuestion && (
                    <button
                      onClick={() => onDeleteQuestion(question.id)}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Exam 컨텐츠 (추후 구현) */}
      {selectedMenu === "exam" && (
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-white font-semibold">Exam</h4>
            <button
              onClick={() => setSelectedMenu(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <p className="text-gray-400 text-sm">Exam 기능 준비 중...</p>
          </div>
        </div>
      )}

      {/* Summary 컨텐츠 (추후 구현) */}
      {selectedMenu === "summary" && (
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-white font-semibold">Summary</h4>
            <button
              onClick={() => setSelectedMenu(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <p className="text-gray-400 text-sm">Summary 기능 준비 중...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes expandPanel {
          0% {
            max-height: 0;
            opacity: 0;
            transform: scaleY(0.8);
            transform-origin: top;
          }
          100% {
            max-height: 500px;
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}

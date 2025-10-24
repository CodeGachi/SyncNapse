/**
 * 질문 리스트 컴포넌트
 * 녹음 리스트와 유사한 스타일
 */

"use client";

import type { Question } from "@/lib/types";
import { useState } from "react";

interface QuestionListProps {
  questions: Question[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onAddQuestion: () => void;
  onAnswerQuestion?: (id: string, answer: string) => void;
  onDeleteQuestion?: (id: string) => void;
}

export function QuestionList({
  questions,
  isExpanded,
  onToggleExpanded,
  onAddQuestion,
  onAnswerQuestion,
  onDeleteQuestion,
}: QuestionListProps) {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  };

  const toggleQuestionDetail = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">질문</h3>
          <span className="text-gray-400 text-sm">({questions.length})</span>
        </div>
        <button
          onClick={onToggleExpanded}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={`transform transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* 질문 추가 버튼 */}
      <button
        onClick={onAddQuestion}
        className="w-full px-4 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-dashed border-[#4a4a4a] rounded-lg text-white transition-colors flex items-center justify-center gap-2"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M10 5V15M5 10H15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>질문 추가</span>
      </button>

      {/* 질문 목록 */}
      {isExpanded && questions.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-[#2a2a2a] rounded-lg overflow-hidden"
            >
              {/* 질문 헤더 */}
              <button
                onClick={() => toggleQuestionDetail(question.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#3a3a3a] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      question.status === "answered"
                        ? "bg-green-600 text-white"
                        : "bg-yellow-600 text-white"
                    }`}
                  >
                    {question.status === "answered" ? "답변완료" : "대기중"}
                  </span>
                  <span className="text-white text-sm">질문 {index + 1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">
                    {formatTimestamp(question.timestamp)}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`transform transition-transform text-gray-400 ${
                      expandedQuestionId === question.id ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>

              {/* 질문 상세 */}
              {expandedQuestionId === question.id && (
                <div className="px-4 pb-4 border-t border-[#3a3a3a]">
                  <div className="mt-3 space-y-3">
                    {/* 작성자 */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">작성자</p>
                      <p className="text-sm text-white">{question.author}</p>
                    </div>

                    {/* 질문 내용 */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">질문 내용</p>
                      <p className="text-sm text-white whitespace-pre-wrap">
                        {question.content}
                      </p>
                    </div>

                    {/* 답변 (있는 경우) */}
                    {question.answer && (
                      <div className="bg-[#1e1e1e] rounded p-3">
                        <p className="text-xs text-gray-400 mb-1">답변</p>
                        <p className="text-sm text-white whitespace-pre-wrap">
                          {question.answer}
                        </p>
                        {question.answeredAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimestamp(question.answeredAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 삭제 버튼 */}
                    {onDeleteQuestion && (
                      <button
                        onClick={() => onDeleteQuestion(question.id)}
                        className="text-sm text-red-500 hover:text-red-400 transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isExpanded && questions.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-4">
          아직 질문이 없습니다
        </p>
      )}
    </div>
  );
}

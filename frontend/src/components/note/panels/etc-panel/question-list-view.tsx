/**
 * 질문 리스트 뷰 컴포넌트
 */

"use client";

import type { Question } from "@/lib/types";

interface QuestionListViewProps {
  questions: Question[];
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function QuestionListView({
  questions,
  onClose,
  onDelete,
}: QuestionListViewProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-semibold">질문 리스트</h4>
          <span className="text-gray-400 text-sm">({questions.length})</span>
        </div>
        <button
          onClick={onClose}
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
                <p className="text-xs text-gray-400">
                  작성자: {question.author}
                </p>
                <p className="text-sm text-white mt-1">{question.content}</p>
              </div>
              {question.answer && (
                <div className="bg-[#1e1e1e] rounded p-2">
                  <p className="text-xs text-gray-400">답변</p>
                  <p className="text-sm text-white mt-1">{question.answer}</p>
                </div>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(question.id)}
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
  );
}

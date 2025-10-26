/**
 * 질문 입력 폼 컴포넌트
 */

"use client";

import { useState } from "react";

interface QuestionFormProps {
  onSubmit: (content: string) => Promise<void>;
  onClose: () => void;
}

export function QuestionForm({ onSubmit, onClose }: QuestionFormProps) {
  const [questionContent, setQuestionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!questionContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(questionContent);
      setQuestionContent("");
      onClose();
    } catch (error) {
      console.error("질문 제출 실패:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h4 className="text-white font-semibold">질문 추가</h4>
        <button
          onClick={() => {
            onClose();
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

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              setQuestionContent("");
            }}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
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
  );
}

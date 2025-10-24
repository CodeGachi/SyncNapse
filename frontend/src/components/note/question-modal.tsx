/**
 * 질문 입력 모달 컴포넌트
 */

"use client";

import { useState } from "react";
import { Modal } from "@/components/common/modal";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, author: string) => void;
}

export function QuestionModal({
  isOpen,
  onClose,
  onSubmit,
}: QuestionModalProps) {
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !author.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content, author);
      setContent("");
      setAuthor("");
      onClose();
    } catch (error) {
      console.error("질문 제출 실패:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent("");
    setAuthor("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-[#2a2a2a] rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">질문 추가</h2>

        <div className="space-y-4">
          {/* 작성자 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              작성자
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* 질문 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              질문 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="질문을 입력하세요"
              rows={5}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || !author.trim() || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>전송 중...</span>
              </>
            ) : (
              <span>질문 추가</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

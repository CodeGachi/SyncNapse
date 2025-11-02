/**
 * etc 패널 컴포넌트 (리팩토링됨)
 * Exam, Summary, 질문 추가, 질문 리스트 기능
 */

"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { MenuButton } from "@/components/note/panels/etc-panel/menu-button";
import { QuestionForm } from "@/components/note/panels/etc-panel/question-form";
import { QuestionListView } from "@/components/note/panels/etc-panel/question-list-view";

interface EtcPanelProps {
  isOpen: boolean;
  questions: Question[];
  onAddQuestion: (content: string, author: string) => void;
  onDeleteQuestion?: (id: string) => void;
  currentUser?: { name: string; email: string } | null;
}

type MenuType = "exam" | "summary" | "question" | "questionList" | null;

export function EtcPanel({
  isOpen,
  questions,
  onAddQuestion,
  onDeleteQuestion,
  currentUser,
}: EtcPanelProps) {
  const [selectedMenu, setSelectedMenu] = useState<MenuType>(null);

  if (!isOpen) return null;

  const handleQuestionSubmit = async (content: string) => {
    const authorName = currentUser?.name || "익명";
    await onAddQuestion(content, authorName);
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

      {/* 메인 메뉴 버튼들 */}
      {!selectedMenu && (
        <div className="flex flex-col items-center gap-6 w-full flex-shrink-0">
          {/* 상단 버튼 그룹 */}
          <div className="flex flex-row justify-center items-center gap-6 w-full">
            <MenuButton
              label="exam"
              onClick={() => setSelectedMenu("exam")}
              color="bg-[#899649]"
            />
            <MenuButton
              label="summary"
              onClick={() => setSelectedMenu("summary")}
              color="bg-[#6C4F4F]"
            />
          </div>

          {/* 하단 버튼 그룹 */}
          <div className="flex flex-row justify-center items-center gap-6 w-full">
            <MenuButton
              label="질문 추가"
              onClick={() => setSelectedMenu("question")}
              color="bg-[#4F6C6C]"
            />
            <MenuButton
              label="질문 리스트"
              onClick={() => setSelectedMenu("questionList")}
              color="bg-[#6C5B4F]"
              badge={questions.length}
            />
          </div>
        </div>
      )}

      {/* 질문 입력 폼 */}
      {selectedMenu === "question" && (
        <QuestionForm
          onSubmit={handleQuestionSubmit}
          onClose={() => setSelectedMenu(null)}
        />
      )}

      {/* 질문 리스트 */}
      {selectedMenu === "questionList" && (
        <QuestionListView
          questions={questions}
          onClose={() => setSelectedMenu(null)}
          onDelete={onDeleteQuestion}
        />
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

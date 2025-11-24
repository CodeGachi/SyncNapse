/**
 * AI 챗봇 패널 컴포넌트
 * PDF 필기에 대한 질문, 요약, 퀴즈 기능 제공
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Panel } from "./panel";

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  noteId?: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type QuickAction = "question" | "summary" | "quiz";

export function ChatbotPanel({ isOpen, onClose, noteId }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 목록 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 빠른 액션 버튼 클릭
  const handleQuickAction = (action: QuickAction) => {
    let prompt = "";
    switch (action) {
      case "question":
        prompt = "이 노트 내용에 대해 질문이 있어요.";
        break;
      case "summary":
        prompt = "이 노트 내용을 요약해주세요.";
        break;
      case "quiz":
        prompt = "이 노트 내용으로 퀴즈를 만들어주세요.";
        break;
    }
    handleSendMessage(prompt);
  };

  // 메시지 전송
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // TODO: AI API 연동
    // 현재는 임시 응답
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "AI 기능 준비 중입니다. 곧 PDF 필기에 대한 질문, 요약, 퀴즈 기능을 사용하실 수 있습니다.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // 대화 초기화
  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <Panel isOpen={isOpen} borderColor="green" title="AI Assistant" onClose={onClose}>
      <div className="flex flex-col h-full">
        {/* 빠른 액션 버튼 - 항상 표시 */}
        <div className="flex flex-col gap-2 p-3 border-b border-[#444444]">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center">
              AI와 대화하여 노트 내용을 분석하세요
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleQuickAction("question")}
              disabled={isLoading}
              className="px-3 py-1.5 bg-[#444444] hover:bg-[#555555] text-white text-xs rounded-full transition-colors disabled:opacity-50"
            >
              질문하기
            </button>
            <button
              onClick={() => handleQuickAction("summary")}
              disabled={isLoading}
              className="px-3 py-1.5 bg-[#6C4F4F] hover:opacity-80 text-white text-xs rounded-full transition-colors disabled:opacity-50"
            >
              요약하기
            </button>
            <button
              onClick={() => handleQuickAction("quiz")}
              disabled={isLoading}
              className="px-3 py-1.5 bg-[#899649] hover:opacity-80 text-white text-xs rounded-full transition-colors disabled:opacity-50"
            >
              퀴즈 생성
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#8B0000] hover:opacity-80 text-white text-xs rounded-full transition-colors disabled:opacity-50"
              >
                새 대화
              </button>
            )}
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-[#AFC02B] text-black"
                    : "bg-[#444444] text-white"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#444444] text-white px-3 py-2 rounded-lg text-sm">
                <span className="animate-pulse">생각 중...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div className="p-3 border-t border-[#444444]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-[#444444] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#AFC02B] placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-[#AFC02B] text-black text-sm font-medium rounded-lg hover:bg-[#9db025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

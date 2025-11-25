/**
 * AI 챗봇 패널 컴포넌트
 * PDF 필기에 대한 질문, 요약, 퀴즈 기능 제공
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
  type?: "question" | "summary" | "quiz" | "normal";
}

type QuickAction = "question" | "summary" | "quiz";

// 아이콘 컴포넌트
const QuestionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const SummaryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const QuizIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

export function ChatbotPanel({ isOpen, onClose, noteId }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    handleSendMessage(prompt, action);
  };

  const handleSendMessage = async (content: string, type: Message["type"] = "normal") => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      type,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // TODO: AI API 연동
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

  const handleClearChat = () => {
    setMessages([]);
  };

  const getTypeIcon = (type?: Message["type"]) => {
    switch (type) {
      case "question":
        return <QuestionIcon />;
      case "summary":
        return <SummaryIcon />;
      case "quiz":
        return <QuizIcon />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type?: Message["type"]) => {
    switch (type) {
      case "question":
        return "질문";
      case "summary":
        return "요약";
      case "quiz":
        return "퀴즈";
      default:
        return null;
    }
  };

  return (
    <Panel isOpen={isOpen} borderColor="gray" title="AI Assistant" onClose={onClose}>
      <div className="flex flex-col h-full">
        {/* 빠른 액션 카드 */}
        <div className="p-3 border-b border-[#3a3a3a]">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Image
                  src="/iconstack.io - (Robot).svg"
                  alt="AI"
                  width={20}
                  height={20}
                  className="opacity-60"
                />
                <span className="text-xs">무엇을 도와드릴까요?</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickAction("question")}
                  disabled={isLoading}
                  className="group flex items-center justify-center py-3 bg-[#4A6FA5] hover:bg-[#5A7FB5] rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <span className="text-sm text-white font-medium">질문</span>
                </button>
                <button
                  onClick={() => handleQuickAction("summary")}
                  disabled={isLoading}
                  className="group flex items-center justify-center py-3 bg-[#8B6B61] hover:bg-[#9B7B71] rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <span className="text-sm text-white font-medium">요약</span>
                </button>
                <button
                  onClick={() => handleQuickAction("quiz")}
                  disabled={isLoading}
                  className="group flex items-center justify-center py-3 bg-[#6B8E5A] hover:bg-[#7B9E6A] rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <span className="text-sm text-white font-medium">퀴즈</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleQuickAction("question")}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-[#4A6FA5] hover:bg-[#5A7FB5] text-white text-[11px] rounded-lg transition-colors disabled:opacity-50"
                >
                  질문
                </button>
                <button
                  onClick={() => handleQuickAction("summary")}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-[#8B6B61] hover:bg-[#9B7B71] text-white text-[11px] rounded-lg transition-colors disabled:opacity-50"
                >
                  요약
                </button>
                <button
                  onClick={() => handleQuickAction("quiz")}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-[#6B8E5A] hover:bg-[#7B9E6A] text-white text-[11px] rounded-lg transition-colors disabled:opacity-50"
                >
                  퀴즈
                </button>
              </div>
              <button
                onClick={handleClearChat}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-gray-300 text-[10px] transition-colors disabled:opacity-50"
                title="새 대화"
              >
                <RefreshIcon />
              </button>
            </div>
          )}
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs">
              <p>대화를 시작해보세요</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[90%] ${message.role === "assistant" ? "flex gap-2" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#AFC02B] to-[#8fa020] flex items-center justify-center">
                    <Image
                      src="/iconstack.io - (Robot).svg"
                      alt="AI"
                      width={16}
                      height={16}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {message.type && message.type !== "normal" && message.role === "user" && (
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 justify-end">
                      {getTypeIcon(message.type)}
                      {getTypeBadge(message.type)}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-[#AFC02B] to-[#c5d62f] text-black rounded-2xl rounded-br-md"
                        : "bg-[#3a3a3a] text-gray-100 rounded-2xl rounded-tl-md"
                    }`}
                  >
                    {message.content}
                  </div>
                  <span className={`text-[10px] text-gray-600 ${message.role === "user" ? "text-right" : ""}`}>
                    {message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#AFC02B] to-[#8fa020] flex items-center justify-center">
                  <Image
                    src="/iconstack.io - (Robot).svg"
                    alt="AI"
                    width={16}
                    height={16}
                  />
                </div>
                <div className="bg-[#3a3a3a] text-gray-100 px-4 py-3 rounded-2xl rounded-tl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}/>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}/>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}/>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div className="p-3 border-t border-[#3a3a3a] bg-[#2a2a2a]">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="w-full bg-[#3a3a3a] text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#AFC02B]/50 placeholder-gray-500 transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#AFC02B] to-[#c5d62f] text-black rounded-xl hover:from-[#9db025] hover:to-[#b3c229] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 disabled:from-gray-600 disabled:to-gray-600"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

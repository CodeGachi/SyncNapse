/**
 * AI 챗봇 패널 컴포넌트
 * PDF 필기에 대한 질문, 요약, 퀴즈 기능 제공
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, MessageSquare, FileText, BrainCircuit, RefreshCw } from "lucide-react";
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
  type?: "normal" | "question" | "summary" | "quiz";
}

// 아이콘 컴포넌트
const QuestionIcon = () => <MessageSquare size={10} className="text-blue-400" />;
const SummaryIcon = () => <FileText size={10} className="text-green-400" />;
const QuizIcon = () => <BrainCircuit size={10} className="text-purple-400" />;

export function ChatbotPanel({ isOpen, onClose, noteId }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAction = (action: "question" | "summary" | "quiz") => {
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
    
    // noteId 검증
    if (!noteId) {
      console.error("Note ID is required for AI chat");
      return;
    }

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

    try {
      // AI API 호출
      const { chatWithAi } = await import("@/lib/api/services/ai.api");
      
      // type을 mode로 매핑
      let mode: "question" | "summary" | "quiz" | undefined;
      if (type === "question") mode = "question";
      else if (type === "summary") mode = "summary";
      else if (type === "quiz") mode = "quiz";

      const response = await chatWithAi({
        lectureNoteId: noteId,
        question: content.trim(),
        mode,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI chat error:", error);
      
      // 에러 메시지 표시
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: error instanceof Error 
          ? error.message 
          : "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
        {/* 빠른 액션 카드 - Sticky Header */}
        <div className="px-4 py-3 border-b border-border bg-background-elevated flex-shrink-0">
          {messages.length === 0 ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-center gap-2 text-foreground-tertiary py-1">
                <Sparkles size={14} className="text-brand" />
                <span className="text-xs font-medium">무엇을 도와드릴까요?</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickAction("question")}
                  disabled={isLoading}
                  className="group flex flex-col items-center justify-center gap-1.5 py-3 bg-background-overlay hover:bg-background-base border border-border hover:border-brand/50 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <MessageSquare size={16} className="text-foreground-tertiary group-hover:text-brand transition-colors" />
                  <span className="text-[11px] text-foreground-secondary group-hover:text-foreground font-medium">질문</span>
                </button>
                <button
                  onClick={() => handleQuickAction("summary")}
                  disabled={isLoading}
                  className="group flex flex-col items-center justify-center gap-1.5 py-3 bg-background-overlay hover:bg-background-base border border-border hover:border-brand/50 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <FileText size={16} className="text-foreground-tertiary group-hover:text-brand transition-colors" />
                  <span className="text-[11px] text-foreground-secondary group-hover:text-foreground font-medium">요약</span>
                </button>
                <button
                  onClick={() => handleQuickAction("quiz")}
                  disabled={isLoading}
                  className="group flex flex-col items-center justify-center gap-1.5 py-3 bg-background-overlay hover:bg-background-base border border-border hover:border-brand/50 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <BrainCircuit size={16} className="text-foreground-tertiary group-hover:text-brand transition-colors" />
                  <span className="text-[11px] text-foreground-secondary group-hover:text-foreground font-medium">퀴즈</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleQuickAction("question")}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 bg-background-overlay hover:bg-background-base border border-border hover:border-brand/50 text-foreground-secondary hover:text-foreground text-[10px] rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <MessageSquare size={10} />
                  질문
                </button>
                <button
                  onClick={() => handleQuickAction("summary")}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 bg-background-overlay hover:bg-background-base border border-border hover:border-brand/50 text-foreground-secondary hover:text-foreground text-[10px] rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileText size={10} />
                  요약
                </button>
                <button
                  onClick={() => handleQuickAction("quiz")}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 bg-background-overlay hover:bg-background-base border border-border hover:border-brand/50 text-foreground-secondary hover:text-foreground text-[10px] rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <BrainCircuit size={10} />
                  퀴즈
                </button>
              </div>
              <button
                onClick={handleClearChat}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1.5 text-foreground-tertiary hover:text-foreground-secondary hover:bg-foreground/5 rounded-lg text-[10px] transition-all disabled:opacity-50"
                title="새 대화"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          )}
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-background-surface">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-foreground-tertiary space-y-3 opacity-60">
              <div className="w-12 h-12 bg-background-elevated rounded-full flex items-center justify-center">
                <Bot size={24} className="text-foreground-tertiary" />
              </div>
              <p className="text-xs font-medium">대화를 시작해보세요</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[85%] ${message.role === "assistant" ? "flex gap-3" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background-elevated border border-border flex items-center justify-center shadow-sm mt-1">
                    <Bot size={16} className="text-brand" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {message.type && message.type !== "normal" && message.role === "user" && (
                    <span className="text-[10px] text-foreground-tertiary flex items-center gap-1 justify-end px-1">
                      {getTypeIcon(message.type)}
                      {getTypeBadge(message.type)}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${message.role === "user"
                      ? "bg-brand/10 border border-brand/20 text-foreground rounded-2xl rounded-tr-sm"
                      : "bg-background-elevated border border-border text-foreground-secondary rounded-2xl rounded-tl-sm"
                      }`}
                  >
                    {message.content}
                  </div>
                  <span className={`text-[10px] text-foreground-tertiary px-1 ${message.role === "user" ? "text-right" : ""}`}>
                    {message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background-elevated border border-border flex items-center justify-center shadow-sm mt-1">
                  <Bot size={16} className="text-brand" />
                </div>
                <div className="bg-background-elevated border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div className="p-3 border-t border-border bg-background-elevated">
          <div className="flex gap-2 items-end bg-background-surface p-1.5 rounded-xl border border-border focus-within:border-brand/50 transition-colors">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="w-full bg-transparent text-foreground text-sm px-3 py-2 focus:outline-none placeholder-foreground-tertiary"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-background-overlay hover:bg-brand text-brand hover:text-black border border-brand/30 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-background-overlay disabled:text-foreground-tertiary disabled:border-transparent transition-all duration-200"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

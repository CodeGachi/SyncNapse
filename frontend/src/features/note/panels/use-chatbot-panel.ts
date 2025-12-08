/**
 * AI 챗봇 패널 훅
 * chatbot-panel.tsx에서 분리된 비즈니스 로직
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { QuizQuestion } from "@/lib/api/services/ai.api";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("ChatbotPanel");

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "normal" | "question" | "summary" | "quiz";
  quiz?: QuizQuestion[];
}

interface UseChatbotPanelProps {
  noteId?: string | null;
}

/**
 * 퀴즈를 마크다운 텍스트로 변환
 */
export function quizToMarkdown(quiz: QuizQuestion[]): string {
  return quiz.map((q, idx) => {
    const options = q.options.map((opt, optIdx) =>
      `${optIdx === q.correctIndex ? "**" : ""}${String.fromCharCode(65 + optIdx)}. ${opt}${optIdx === q.correctIndex ? " (정답)**" : ""}`
    ).join("\n");
    return `### 문제 ${idx + 1}\n${q.question}\n\n${options}\n\n> **해설:** ${q.explanation}`;
  }).join("\n\n---\n\n");
}

export function useChatbotPanel({ noteId }: UseChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 메시지 복사
  const handleCopyMessage = useCallback(async (message: Message) => {
    try {
      const textToCopy = message.quiz && message.quiz.length > 0
        ? quizToMarkdown(message.quiz)
        : message.content;

      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      log.error("Failed to copy:", error);
    }
  }, []);

  // 마크다운 파일로 내보내기
  const handleExportMessage = useCallback((message: Message) => {
    const content = message.quiz && message.quiz.length > 0
      ? `# 퀴즈\n\n${quizToMarkdown(message.quiz)}`
      : `# ${message.type === "summary" ? "요약" : "AI 응답"}\n\n${message.content}`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${message.type || "chat"}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 메시지 전송
  const handleSendMessage = useCallback(async (content: string, type: Message["type"] = "normal") => {
    if (!content.trim() || isLoading) return;

    // noteId 검증
    if (!noteId) {
      log.error("Note ID is required for AI chat");
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
        type,
        quiz: response.quiz,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      log.error("AI chat error:", error);

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
  }, [isLoading, noteId]);

  // 빠른 액션 핸들러
  const handleQuickAction = useCallback((action: "summary" | "quiz") => {
    const prompt = action === "summary"
      ? "이 노트 내용을 요약해주세요."
      : "이 노트 내용으로 퀴즈를 만들어주세요.";
    handleSendMessage(prompt, action);
  }, [handleSendMessage]);

  // 키 입력 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  }, [handleSendMessage, inputValue]);

  // 대화 초기화
  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // 타입별 아이콘/배지 가져오기
  const getTypeBadge = useCallback((type?: Message["type"]) => {
    switch (type) {
      case "summary":
        return "요약";
      case "quiz":
        return "퀴즈";
      default:
        return null;
    }
  }, []);

  return {
    // 상태
    messages,
    inputValue,
    setInputValue,
    isLoading,
    copiedId,
    messagesEndRef,

    // 핸들러
    handleCopyMessage,
    handleExportMessage,
    handleSendMessage,
    handleQuickAction,
    handleKeyDown,
    handleClearChat,

    // 유틸리티
    getTypeBadge,
  };
}

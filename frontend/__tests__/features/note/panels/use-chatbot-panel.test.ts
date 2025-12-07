/**
 * use-chatbot-panel 훅 테스트
 * AI 챗봇 패널 비즈니스 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useChatbotPanel,
  quizToMarkdown,
  type Message,
} from "@/features/note/panels/use-chatbot-panel";

// Mock AI API
const mockChatWithAi = vi.fn();

vi.mock("@/lib/api/services/ai.api", () => ({
  chatWithAi: (...args: unknown[]) => mockChatWithAi(...args),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe("useChatbotPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.inputValue).toBe("");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.copiedId).toBeNull();
    });
  });

  describe("handleSendMessage", () => {
    it("빈 메시지는 전송하지 않음", async () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("");
      });

      expect(result.current.messages).toHaveLength(0);
      expect(mockChatWithAi).not.toHaveBeenCalled();
    });

    it("noteId 없으면 전송하지 않음", async () => {
      const { result } = renderHook(() => useChatbotPanel({ noteId: null }));

      await act(async () => {
        await result.current.handleSendMessage("Hello");
      });

      expect(result.current.messages).toHaveLength(0);
      expect(mockChatWithAi).not.toHaveBeenCalled();
    });

    it("메시지 전송 성공", async () => {
      mockChatWithAi.mockResolvedValue({
        answer: "AI response",
      });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("Hello");
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("Hello");
      expect(result.current.messages[1].role).toBe("assistant");
      expect(result.current.messages[1].content).toBe("AI response");
    });

    it("메시지 전송 시 로딩 상태 변경", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockChatWithAi.mockReturnValue(promise);

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      // 전송 시작
      act(() => {
        result.current.handleSendMessage("Hello");
      });

      // 로딩 중
      expect(result.current.isLoading).toBe(true);

      // 응답 완료
      await act(async () => {
        resolvePromise!({ answer: "Response" });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("API 에러 시 에러 메시지 표시", async () => {
      mockChatWithAi.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("Hello");
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe("API Error");
    });

    it("type별 mode 매핑 - question", async () => {
      mockChatWithAi.mockResolvedValue({ answer: "Response" });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("질문", "question");
      });

      expect(mockChatWithAi).toHaveBeenCalledWith({
        lectureNoteId: "note-1",
        question: "질문",
        mode: "question",
      });
    });

    it("type별 mode 매핑 - summary", async () => {
      mockChatWithAi.mockResolvedValue({ answer: "요약 결과" });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("요약해줘", "summary");
      });

      expect(mockChatWithAi).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "summary",
        })
      );
    });

    it("type별 mode 매핑 - quiz", async () => {
      mockChatWithAi.mockResolvedValue({
        answer: "퀴즈",
        quiz: [
          {
            question: "Q1",
            options: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "Explanation",
          },
        ],
      });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("퀴즈 만들어줘", "quiz");
      });

      expect(mockChatWithAi).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "quiz",
        })
      );
      expect(result.current.messages[1].quiz).toHaveLength(1);
    });
  });

  describe("handleQuickAction", () => {
    it("summary 액션", async () => {
      mockChatWithAi.mockResolvedValue({ answer: "요약 결과" });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleQuickAction("summary");
      });

      expect(result.current.messages[0].content).toBe(
        "이 노트 내용을 요약해주세요."
      );
      expect(result.current.messages[0].type).toBe("summary");
    });

    it("quiz 액션", async () => {
      mockChatWithAi.mockResolvedValue({ answer: "퀴즈", quiz: [] });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleQuickAction("quiz");
      });

      expect(result.current.messages[0].content).toBe(
        "이 노트 내용으로 퀴즈를 만들어주세요."
      );
      expect(result.current.messages[0].type).toBe("quiz");
    });
  });

  describe("handleKeyDown", () => {
    it("Enter 키로 메시지 전송", async () => {
      mockChatWithAi.mockResolvedValue({ answer: "Response" });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      act(() => {
        result.current.setInputValue("Hello");
      });

      const mockEvent = {
        key: "Enter",
        shiftKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(2);
    });

    it("Shift+Enter는 전송하지 않음", async () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      act(() => {
        result.current.setInputValue("Hello");
      });

      const mockEvent = {
        key: "Enter",
        shiftKey: true,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe("handleCopyMessage", () => {
    it("일반 메시지 복사", async () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Test content",
        timestamp: new Date(),
      };

      await act(async () => {
        await result.current.handleCopyMessage(message);
      });

      expect(mockWriteText).toHaveBeenCalledWith("Test content");
      expect(result.current.copiedId).toBe("msg-1");

      // 2초 후 copiedId 초기화
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.copiedId).toBeNull();
    });

    it("퀴즈 메시지 복사 (마크다운 형식)", async () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Quiz",
        timestamp: new Date(),
        type: "quiz",
        quiz: [
          {
            question: "Q1?",
            options: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "A is correct",
          },
        ],
      };

      await act(async () => {
        await result.current.handleCopyMessage(message);
      });

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("Q1?"));
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining("(정답)")
      );
    });
  });

  describe("handleExportMessage", () => {
    it("일반 메시지 내보내기", () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Test content",
        timestamp: new Date(),
        type: "summary",
      };

      // Mock document methods
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockClick = vi.fn();

      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
      const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);
      const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
        href: "",
        download: "",
        click: mockClick,
      } as unknown as HTMLAnchorElement);

      act(() => {
        result.current.handleExportMessage(message);
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Restore mocks to prevent affecting other tests
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createElementSpy.mockRestore();
    });
  });

  describe("handleClearChat", () => {
    it("대화 초기화", async () => {
      mockChatWithAi.mockResolvedValue({ answer: "Response" });

      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      await act(async () => {
        await result.current.handleSendMessage("Hello");
      });

      expect(result.current.messages.length).toBeGreaterThan(0);

      act(() => {
        result.current.handleClearChat();
      });

      expect(result.current.messages).toEqual([]);
    });
  });

  describe("getTypeBadge", () => {
    it("summary 타입", () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      expect(result.current.getTypeBadge("summary")).toBe("요약");
    });

    it("quiz 타입", () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      expect(result.current.getTypeBadge("quiz")).toBe("퀴즈");
    });

    it("기타 타입은 null 반환", () => {
      const { result } = renderHook(() =>
        useChatbotPanel({ noteId: "note-1" })
      );

      expect(result.current.getTypeBadge("normal")).toBeNull();
      expect(result.current.getTypeBadge(undefined)).toBeNull();
    });
  });
});

describe("quizToMarkdown", () => {
  it("퀴즈를 마크다운으로 변환", () => {
    const quiz = [
      {
        question: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1,
        explanation: "Basic math",
      },
    ];

    const markdown = quizToMarkdown(quiz);

    expect(markdown).toContain("### 문제 1");
    expect(markdown).toContain("What is 2+2?");
    expect(markdown).toContain("**B. 4 (정답)**");
    expect(markdown).toContain("**해설:** Basic math");
  });

  it("여러 문제 변환", () => {
    const quiz = [
      {
        question: "Q1?",
        options: ["A", "B"],
        correctIndex: 0,
        explanation: "E1",
      },
      {
        question: "Q2?",
        options: ["C", "D"],
        correctIndex: 1,
        explanation: "E2",
      },
    ];

    const markdown = quizToMarkdown(quiz);

    expect(markdown).toContain("### 문제 1");
    expect(markdown).toContain("### 문제 2");
    expect(markdown).toContain("---"); // 구분선
  });
});

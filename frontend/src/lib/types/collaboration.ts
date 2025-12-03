/**
 * 실시간 협업 기능 타입 정의
 * 손들기, 투표, 이모지, Q&A
 */

/**
 * 손들기 (Hand Raise)
 */
export interface HandRaise {
  id: string;
  userId: string;
  userName: string;
  noteId: string;
  timestamp: number;
  isActive: boolean;
}

/**
 * 빠른 투표 (Quick Poll)
 */
export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[]; // userId 배열
}

export interface Poll {
  id: string;
  noteId: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  results: {
    totalVotes: number;
    percentages: Record<string, number>; // option id -> percentage
  };
}

/**
 * 실시간 반응 이모지 (Emoji Reaction)
 */
export interface EmojiReaction {
  id: string;
  userId: string;
  userName: string;
  emoji: string; // "👍", "❤️", "😂", "🔥", "😮", "😢"
  noteId: string;
  timestamp: number;
  x?: number; // 화면 위치 (애니메이션용)
  y?: number;
}

export const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"] as const;
export type AvailableEmoji = (typeof AVAILABLE_EMOJIS)[number];

/**
 * Q&A 질문/답변
 */
export interface Answer {
  id: string;
  questionId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  isSelected: boolean; // 강사가 선택한 최고의 답변
  likes: number;
}

export interface Question {
  id: string;
  noteId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  answers: Answer[];
  upvotes: number;
  voters: string[]; // 투표한 사용자들
  isSharedToAll: boolean; // 전체 공유 여부
  isPinned: boolean; // 강사가 고정한 질문
}

/**
 * 협업 기능 UI 상태
 */
export interface CollaborationPanelState {
  activeTab: "hands" | "poll" | "emoji" | "qa";
  handRaises: HandRaise[];
  currentPoll: Poll | null;
  emojiReactions: EmojiReaction[];
  questions: Question[];

  // UI 상태
  isPollCreating: boolean;
  isQAExpanded: boolean;
}

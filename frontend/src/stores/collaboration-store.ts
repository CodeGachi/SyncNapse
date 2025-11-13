/**
 * 실시간 협업 기능 상태 관리 (Zustand)
 */

import { create } from "zustand";
import type {
  HandRaise,
  Poll,
  PollOption,
  EmojiReaction,
  Question,
  Answer,
  AvailableEmoji,
} from "@/lib/types/collaboration";

interface CollaborationStore {
  // 손들기
  handRaises: HandRaise[];
  addHandRaise: (userId: string, userName: string, noteId: string) => void;
  removeHandRaise: (userId: string) => void;
  clearHandRaises: () => void;

  // 투표
  currentPoll: Poll | null;
  createPoll: (
    noteId: string,
    question: string,
    options: string[],
    createdBy: string
  ) => void;
  votePoll: (userId: string, optionId: string) => void;
  closePoll: () => void;

  // 이모지 반응
  emojiReactions: EmojiReaction[];
  addEmojiReaction: (
    userId: string,
    userName: string,
    emoji: AvailableEmoji,
    noteId: string
  ) => void;
  removeEmojiReaction: (reactionId: string) => void;
  clearOldReactions: () => void; // 오래된 반응 자동 삭제

  // Q&A
  questions: Question[];
  addQuestion: (
    noteId: string,
    content: string,
    authorId: string,
    authorName: string
  ) => void;
  addAnswer: (
    questionId: string,
    content: string,
    authorId: string,
    authorName: string
  ) => void;
  upvoteQuestion: (questionId: string, userId: string) => void;
  selectBestAnswer: (questionId: string, answerId: string) => void;
  toggleShareQuestion: (questionId: string) => void;
  togglePinQuestion: (questionId: string) => void;
  deleteQuestion: (questionId: string) => void;

  // UI 상태
  activeTab: "hands" | "poll" | "emoji" | "qa";
  setActiveTab: (tab: "hands" | "poll" | "emoji" | "qa") => void;
  isPollCreating: boolean;
  setPollCreating: (creating: boolean) => void;
  isQAExpanded: boolean;
  setQAExpanded: (expanded: boolean) => void;
}

export const useCollaborationStore = create<CollaborationStore>((set) => ({
  // 손들기
  handRaises: [],
  addHandRaise: (userId, userName, noteId) =>
    set((state) => ({
      handRaises: [
        ...state.handRaises,
        {
          id: `hand-${userId}-${Date.now()}`,
          userId,
          userName,
          noteId,
          timestamp: Date.now(),
          isActive: true,
        },
      ],
    })),
  removeHandRaise: (userId) =>
    set((state) => ({
      handRaises: state.handRaises.filter((h) => h.userId !== userId),
    })),
  clearHandRaises: () => set({ handRaises: [] }),

  // 투표
  currentPoll: null,
  createPoll: (noteId, question, options, createdBy) =>
    set({
      currentPoll: {
        id: `poll-${Date.now()}`,
        noteId,
        question,
        options: options.map((text, index) => ({
          id: `option-${index}`,
          text,
          votes: 0,
          voters: [],
        })),
        createdBy,
        createdAt: Date.now(),
        isActive: true,
        results: {
          totalVotes: 0,
          percentages: {},
        },
      },
    }),
  votePoll: (userId, optionId) =>
    set((state) => {
      if (!state.currentPoll) return state;

      const updatedOptions = state.currentPoll.options.map((opt) => {
        if (opt.id === optionId) {
          // 중복 투표 방지
          if (opt.voters.includes(userId)) {
            return opt;
          }
          return {
            ...opt,
            votes: opt.votes + 1,
            voters: [...opt.voters, userId],
          };
        }
        return opt;
      });

      const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);
      const percentages = updatedOptions.reduce(
        (acc, opt) => ({
          ...acc,
          [opt.id]: totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0,
        }),
        {}
      );

      return {
        currentPoll: {
          ...state.currentPoll,
          options: updatedOptions,
          results: {
            totalVotes,
            percentages,
          },
        },
      };
    }),
  closePoll: () =>
    set((state) => ({
      currentPoll: state.currentPoll
        ? { ...state.currentPoll, isActive: false }
        : null,
    })),

  // 이모지 반응
  emojiReactions: [],
  addEmojiReaction: (userId, userName, emoji, noteId) =>
    set((state) => ({
      emojiReactions: [
        ...state.emojiReactions,
        {
          id: `emoji-${Date.now()}-${Math.random()}`,
          userId,
          userName,
          emoji,
          noteId,
          timestamp: Date.now(),
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight * 0.5,
        },
      ],
    })),
  removeEmojiReaction: (reactionId) =>
    set((state) => ({
      emojiReactions: state.emojiReactions.filter((r) => r.id !== reactionId),
    })),
  clearOldReactions: () =>
    set((state) => {
      const now = Date.now();
      const REACTION_LIFETIME = 3000; // 3초
      return {
        emojiReactions: state.emojiReactions.filter(
          (r) => now - r.timestamp < REACTION_LIFETIME
        ),
      };
    }),

  // Q&A
  questions: [],
  addQuestion: (noteId, content, authorId, authorName) =>
    set((state) => ({
      questions: [
        ...state.questions,
        {
          id: `question-${Date.now()}`,
          noteId,
          content,
          authorId,
          authorName,
          createdAt: Date.now(),
          answers: [],
          upvotes: 0,
          voters: [],
          isSharedToAll: false,
          isPinned: false,
        },
      ],
    })),
  addAnswer: (questionId, content, authorId, authorName) =>
    set((state) => ({
      questions: state.questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            answers: [
              ...q.answers,
              {
                id: `answer-${Date.now()}`,
                questionId,
                content,
                authorId,
                authorName,
                createdAt: Date.now(),
                isSelected: false,
                likes: 0,
              },
            ],
          };
        }
        return q;
      }),
    })),
  upvoteQuestion: (questionId, userId) =>
    set((state) => ({
      questions: state.questions.map((q) => {
        if (q.id === questionId) {
          if (q.voters.includes(userId)) {
            return q; // 이미 투표한 사용자
          }
          return {
            ...q,
            upvotes: q.upvotes + 1,
            voters: [...q.voters, userId],
          };
        }
        return q;
      }),
    })),
  selectBestAnswer: (questionId, answerId) =>
    set((state) => ({
      questions: state.questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            answers: q.answers.map((a) => ({
              ...a,
              isSelected: a.id === answerId,
            })),
          };
        }
        return q;
      }),
    })),
  toggleShareQuestion: (questionId) =>
    set((state) => ({
      questions: state.questions.map((q) => {
        if (q.id === questionId) {
          return { ...q, isSharedToAll: !q.isSharedToAll };
        }
        return q;
      }),
    })),
  togglePinQuestion: (questionId) =>
    set((state) => ({
      questions: state.questions.map((q) => {
        if (q.id === questionId) {
          return { ...q, isPinned: !q.isPinned };
        }
        return q;
      }),
    })),
  deleteQuestion: (questionId) =>
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== questionId),
    })),

  // UI 상태
  activeTab: "hands",
  setActiveTab: (tab) => set({ activeTab: tab }),
  isPollCreating: false,
  setPollCreating: (creating) => set({ isPollCreating: creating }),
  isQAExpanded: false,
  setQAExpanded: (expanded) => set({ isQAExpanded: expanded }),
}));

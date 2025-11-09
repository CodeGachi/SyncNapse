/**
 * Liveblocks 기반 실시간 협업 기능 훅
 *
 * CollaborationStore를 대체하여 Liveblocks Storage를 사용합니다.
 * - 손들기 (Hand Raise)
 * - 투표 (Poll)
 * - 이모지 반응 (Emoji Reaction)
 * - 질문/답변 (Q&A)
 */

"use client";

import { useCallback } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";

export function useLivebloksCollaboration() {
  const broadcastEvent = useBroadcastEvent();

  // === Storage에서 데이터 조회 ===
  const handRaises = useStorage((root) => root.handRaises || []);
  const polls = useStorage((root) => root.polls || []);
  const questions = useStorage((root) => root.questions || []);

  // === 손들기 (Hand Raise) ===
  const addHandRaise = useMutation(
    ({ storage }, userId: string, userName: string) => {
      const handRaises = storage.get("handRaises");
      const newHandRaise = {
        id: `hand-${userId}-${Date.now()}`,
        userId,
        userName,
        timestamp: Date.now(),
        isActive: true,
      };

      if (handRaises) {
        handRaises.push(newHandRaise);
      } else {
        storage.set("handRaises", [newHandRaise]);
      }

      broadcastEvent({ type: "HAND_RAISE", userId, userName });
    },
    [broadcastEvent]
  );

  const removeHandRaise = useMutation(({ storage }, handRaiseId: string) => {
    const handRaises = storage.get("handRaises");
    if (!handRaises) return;

    const index = handRaises.findIndex((h: any) => h.id === handRaiseId);
    if (index !== -1) {
      handRaises.splice(index, 1);
    }
  }, []);

  // === 투표 (Poll) ===
  const createPoll = useMutation(
    (
      { storage },
      question: string,
      options: string[],
      createdBy: string
    ) => {
      const polls = storage.get("polls");
      const newPoll = {
        id: `poll-${Date.now()}`,
        question,
        options: options.map((text) => ({ text, votes: [] })),
        createdBy,
        createdAt: Date.now(),
        isActive: true,
      };

      if (polls) {
        polls.push(newPoll);
      } else {
        storage.set("polls", [newPoll]);
      }
    },
    []
  );

  const votePoll = useMutation(
    ({ storage }, pollId: string, optionIndex: number, userId: string) => {
      const polls = storage.get("polls");
      if (!polls) return;

      const poll = polls.find((p: any) => p.id === pollId);
      if (!poll || !poll.isActive) return;

      // 기존 투표 제거 (중복 투표 방지)
      poll.options.forEach((opt: any) => {
        const voteIndex = opt.votes.indexOf(userId);
        if (voteIndex !== -1) {
          opt.votes.splice(voteIndex, 1);
        }
      });

      // 새 투표 추가
      poll.options[optionIndex].votes.push(userId);

      broadcastEvent({
        type: "POLL_VOTE",
        pollId,
        optionIndex,
        userId,
      });
    },
    [broadcastEvent]
  );

  const closePoll = useMutation(({ storage }, pollId: string) => {
    const polls = storage.get("polls");
    if (!polls) return;

    const poll = polls.find((p: any) => p.id === pollId);
    if (poll) {
      poll.isActive = false;
    }
  }, []);

  // === 이모지 반응 (Emoji Reaction) - 브로드캐스트만 사용 ===
  const addEmojiReaction = useCallback(
    (emoji: string, userId: string, userName: string) => {
      broadcastEvent({
        type: "EMOJI_REACTION",
        userId,
        userName,
        emoji,
        timestamp: Date.now(),
      });
    },
    [broadcastEvent]
  );

  // === 질문/답변 (Q&A) ===
  const addQuestion = useMutation(
    (
      { storage },
      content: string,
      authorId: string,
      authorName: string
    ) => {
      const questions = storage.get("questions");
      const newQuestion = {
        id: `question-${Date.now()}`,
        content,
        authorId,
        authorName,
        createdAt: Date.now(),
        answers: [],
        upvotes: [],
        isPinned: false,
        isSharedToAll: false,
      };

      if (questions) {
        questions.push(newQuestion);
      } else {
        storage.set("questions", [newQuestion]);
      }

      broadcastEvent({
        type: "QUESTION_ADDED",
        questionId: newQuestion.id,
      });
    },
    [broadcastEvent]
  );

  const addAnswer = useMutation(
    (
      { storage },
      questionId: string,
      content: string,
      authorId: string,
      authorName: string
    ) => {
      const questions = storage.get("questions");
      if (!questions) return;

      const question = questions.find((q: any) => q.id === questionId);
      if (!question) return;

      const newAnswer = {
        id: `answer-${Date.now()}`,
        content,
        authorId,
        authorName,
        createdAt: Date.now(),
        isBest: false,
      };

      question.answers.push(newAnswer);
    },
    []
  );

  const upvoteQuestion = useMutation(
    ({ storage }, questionId: string, userId: string) => {
      const questions = storage.get("questions");
      if (!questions) return;

      const question = questions.find((q: any) => q.id === questionId);
      if (!question) return;

      const upvoteIndex = question.upvotes.indexOf(userId);
      if (upvoteIndex === -1) {
        question.upvotes.push(userId);
      } else {
        question.upvotes.splice(upvoteIndex, 1); // 토글
      }
    },
    []
  );

  const selectBestAnswer = useMutation(
    ({ storage }, questionId: string, answerId: string) => {
      const questions = storage.get("questions");
      if (!questions) return;

      const question = questions.find((q: any) => q.id === questionId);
      if (!question) return;

      // 모든 답변의 isBest를 false로 설정
      question.answers.forEach((a: any) => {
        a.isBest = a.id === answerId;
      });
    },
    []
  );

  const shareQuestion = useMutation(({ storage }, questionId: string) => {
    const questions = storage.get("questions");
    if (!questions) return;

    const question = questions.find((q: any) => q.id === questionId);
    if (question) {
      question.isSharedToAll = true;
    }
  }, []);

  const pinQuestion = useMutation(({ storage }, questionId: string) => {
    const questions = storage.get("questions");
    if (!questions) return;

    const question = questions.find((q: any) => q.id === questionId);
    if (question) {
      question.isPinned = !question.isPinned;
    }
  }, []);

  // === 이벤트 리스너 ===
  useEventListener(({ event, connectionId, user }) => {
    if (event.type === "EMOJI_REACTION") {
      console.log(`[Liveblocks] ${event.userName} reacted with ${event.emoji}`);
      // UI 업데이트 (애니메이션 등)
    } else if (event.type === "HAND_RAISE") {
      console.log(`[Liveblocks] ${event.userName} raised hand`);
      // 알림 표시
    } else if (event.type === "POLL_VOTE") {
      console.log(`[Liveblocks] User voted on poll ${event.pollId}`);
    } else if (event.type === "QUESTION_ADDED") {
      console.log(`[Liveblocks] New question added: ${event.questionId}`);
    }
  });

  return {
    // 데이터
    handRaises,
    polls,
    questions,

    // 손들기
    addHandRaise,
    removeHandRaise,

    // 투표
    createPoll,
    votePoll,
    closePoll,

    // 이모지
    addEmojiReaction,

    // Q&A
    addQuestion,
    addAnswer,
    upvoteQuestion,
    selectBestAnswer,
    shareQuestion,
    pinQuestion,
  };
}

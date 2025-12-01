/**
 * 투표 기능 훅 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 투표 기능 제공
 * - Educator가 투표 생성 → Storage에 추가
 * - 모든 참여자가 투표 참여 가능
 * - 실시간 결과 확인
 */

import { useEffect } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("usePoll");

/** 투표 옵션 타입 */
export interface PollOption {
  text: string;
  votes: string[];
}

/** 투표 데이터 타입 */
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: number;
  isActive: boolean;
}

interface UsePollProps {
  userId: string;
  isEducator?: boolean;
}

interface UsePollReturn {
  /** 전체 투표 목록 */
  polls: readonly Poll[];
  /** 현재 활성화된 투표 */
  activePoll: Poll | undefined;
  /** 투표 생성 (Educator만) */
  handleCreatePoll: (question: string, options: string[]) => void;
  /** 투표 참여 */
  handleVote: (pollId: string, optionIndex: number) => void;
  /** 투표 종료 (Educator만) */
  handleEndPoll: (pollId: string) => void;
}

/**
 * 투표 기능 커스텀 훅
 */
export function usePoll({ userId, isEducator = false }: UsePollProps): UsePollReturn {
  // Liveblocks Storage에서 투표 목록 가져오기
  const polls = useStorage((root) => root.polls) || [];
  const broadcast = useBroadcastEvent();

  // 현재 활성화된 투표
  const activePoll = polls.find((p) => p.isActive);

  // 투표 목록 변경 감지 (디버깅용)
  useEffect(() => {
    log.debug("투표 목록 업데이트:", {
      userId,
      isEducator,
      pollCount: polls.length,
      activePoll: activePoll
        ? {
            id: activePoll.id,
            question: activePoll.question,
            optionCount: activePoll.options.length,
          }
        : null,
    });
  }, [polls, userId, isEducator, activePoll]);

  // 투표 생성 Mutation (Educator만)
  const createPoll = useMutation(
    ({ storage }, question: string, options: string[]) => {
      log.debug("Storage 접근 시작");
      const pollsStorage = storage.get("polls");
      log.debug("현재 polls 배열:", pollsStorage);
      log.debug("polls 타입:", typeof pollsStorage, Array.isArray(pollsStorage));

      // 기존 활성 투표 비활성화 (LiveList 중첩 객체 문제 해결)
      for (let i = 0; i < pollsStorage.length; i++) {
        const poll = pollsStorage.get(i);
        if (!poll) continue;
        if (poll.isActive) {
          pollsStorage.set(i, { ...poll, isActive: false });
        }
      }

      // 새 투표 생성
      const newPoll: Poll = {
        id: `poll-${Date.now()}`,
        question,
        options: options.map((opt) => ({
          text: opt,
          votes: [],
        })),
        createdBy: userId,
        createdAt: Date.now(),
        isActive: true,
      };

      log.debug("새 투표 생성:", newPoll);
      pollsStorage.push(newPoll);
      log.debug("투표 추가 후 배열 길이:", pollsStorage.length);
    },
    [userId]
  );

  // 투표 참여 Mutation
  const vote = useMutation(
    ({ storage }, pollId: string, optionIndex: number) => {
      const pollsStorage = storage.get("polls");
      const pollIndex = pollsStorage.findIndex((p) => p.id === pollId);
      if (pollIndex === -1) return;

      const poll = pollsStorage.get(pollIndex);
      if (!poll) return;

      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      pollsStorage.set(pollIndex, {
        ...poll,
        options: poll.options.map((option, idx) => ({
          ...option,
          votes:
            idx === optionIndex
              ? // 선택한 옵션: 기존 투표 제거 후 추가
                option.votes.includes(userId)
                ? option.votes // 이미 투표했으면 그대로
                : [...option.votes, userId]
              : // 다른 옵션: 기존 투표 제거
                option.votes.filter((id) => id !== userId),
        })),
      });
    },
    [userId]
  );

  // 투표 종료 Mutation (Educator만)
  const endPoll = useMutation(({ storage }, pollId: string) => {
    const pollsStorage = storage.get("polls");
    const pollIndex = pollsStorage.findIndex((p) => p.id === pollId);
    if (pollIndex === -1) return;

    const poll = pollsStorage.get(pollIndex);
    if (!poll) return;

    // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
    pollsStorage.set(pollIndex, {
      ...poll,
      isActive: false,
    });
  }, []);

  // 투표 생성 핸들러
  const handleCreatePoll = (question: string, options: string[]) => {
    const validOptions = options.filter((opt) => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      log.debug("투표 생성 시작:", {
        userId,
        isEducator,
        question,
        options: validOptions,
      });

      const pollId = `poll-${Date.now()}`;

      // 1. Storage에 저장
      createPoll(question, validOptions);
      log.debug("투표 생성 완료 (Mutation 실행됨)");

      // 2. Broadcast로 즉시 알림
      broadcast({
        type: "POLL_CREATED",
        pollId,
        question,
      });
      log.debug("투표 생성 Broadcast 전송 완료");
    }
  };

  // 투표 참여 핸들러
  const handleVote = (pollId: string, optionIndex: number) => {
    log.debug("투표 참여:", { pollId, optionIndex, userId });

    // 1. Storage에 저장
    vote(pollId, optionIndex);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "POLL_VOTE",
      pollId,
      optionIndex,
      userId,
    });
    log.debug("투표 Broadcast 전송 완료");
  };

  // 투표 종료 핸들러
  const handleEndPoll = (pollId: string) => {
    log.debug("투표 종료:", { pollId });

    // 1. Storage에 저장
    endPoll(pollId);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "POLL_ENDED",
      pollId,
    });
    log.debug("투표 종료 Broadcast 전송 완료");
  };

  return {
    polls,
    activePoll,
    handleCreatePoll,
    handleVote,
    handleEndPoll,
  };
}

/** 투표 이벤트 리스너 훅 */
export function usePollEventListener(
  isEducator: boolean,
  callbacks: {
    onPollCreated?: (question: string) => void;
    onPollEnded?: () => void;
    onPollVote?: () => void;
  }
) {
  useEventListener(({ event }) => {
    if (event.type === "POLL_CREATED") {
      log.debug("새 투표 생성됨:", event.question);
      if (!isEducator && callbacks.onPollCreated) {
        callbacks.onPollCreated(event.question as string);
      }
    } else if (event.type === "POLL_ENDED") {
      log.debug("투표 종료됨:", event.pollId);
      if (callbacks.onPollEnded) {
        callbacks.onPollEnded();
      }
    } else if (event.type === "POLL_VOTE") {
      log.debug("투표 참여:", event);
      if (callbacks.onPollVote) {
        callbacks.onPollVote();
      }
    }
  });
}

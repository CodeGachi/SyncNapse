/**
 * 이모지 반응 오버레이
 *
 * Liveblocks Broadcast 이벤트를 통한 실시간 이모지 반응 표시
 * - 화면 상단에서 하단으로 떨어지는 애니메이션
 * - 5초 후 자동 제거
 */

"use client";

import { useEffect } from "react";
import {
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { useCollaborationStore } from "@/stores/collaboration-store";
import type { AvailableEmoji } from "@/lib/types/collaboration";

interface EmojiReactionsProps {
  noteId: string;
  userId: string;
  userName: string;
}

export function EmojiReactions({
  noteId,
  userId,
  userName,
}: EmojiReactionsProps) {
  const { emojiReactions, addEmojiReaction, removeEmojiReaction, clearOldReactions } =
    useCollaborationStore();

  // 이모지 전송 (Broadcast)
  const broadcast = useBroadcastEvent();

  // 이모지 Broadcast 이벤트 수신
  useEventListener(({ event }) => {
    if (event.type === "EMOJI_REACTION") {
      // Store에 이모지 추가
      addEmojiReaction(
        event.userId,
        event.userName,
        event.emoji as AvailableEmoji,
        noteId
      );
    }
  });

  // 오래된 이모지 자동 제거 (5초마다 체크)
  useEffect(() => {
    const interval = setInterval(() => {
      clearOldReactions();
    }, 1000); // 1초마다 체크

    return () => clearInterval(interval);
  }, [clearOldReactions]);

  // 각 이모지의 5초 타이머
  useEffect(() => {
    emojiReactions.forEach((reaction) => {
      const age = Date.now() - reaction.timestamp;
      const remaining = 5000 - age;

      if (remaining > 0) {
        const timer = setTimeout(() => {
          removeEmojiReaction(reaction.id);
        }, remaining);

        return () => clearTimeout(timer);
      }
    });
  }, [emojiReactions, removeEmojiReaction]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {emojiReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute animate-emoji-float"
          style={{
            left: reaction.x || Math.random() * window.innerWidth,
            top: -50,
            fontSize: "3rem",
            animationDuration: "5s",
            animationDelay: "0s",
          }}
        >
          {reaction.emoji}
        </div>
      ))}

      <style jsx>{`
        @keyframes emoji-float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(40vh) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-emoji-float {
          animation: emoji-float 5s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

/**
 * 이모지 전송 훅
 */
export function useEmojiReaction(noteId: string, userId: string, userName: string) {
  const broadcast = useBroadcastEvent();
  const { addEmojiReaction } = useCollaborationStore();

  const sendEmoji = (emoji: AvailableEmoji) => {
    // 1. 로컬 Store에 즉시 추가 (본인도 보이도록)
    addEmojiReaction(userId, userName, emoji, noteId);

    // 2. Broadcast로 다른 사용자들에게 전송
    broadcast({
      type: "EMOJI_REACTION",
      userId,
      userName,
      emoji,
      timestamp: Date.now(),
    });
  };

  return { sendEmoji };
}

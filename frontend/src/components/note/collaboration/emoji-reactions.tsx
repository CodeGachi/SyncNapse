/**
 * 이모지 반응 오버레이 (토스트 스타일)
 *
 * Liveblocks Broadcast 이벤트를 통한 실시간 이모지 반응 표시
 * - 화면 우측 하단에 토스트처럼 나타남
 * - 3초 후 자동 제거
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

  // 오래된 이모지 자동 제거 (3초마다 체크)
  useEffect(() => {
    const interval = setInterval(() => {
      clearOldReactions();
    }, 1000); // 1초마다 체크

    return () => clearInterval(interval);
  }, [clearOldReactions]);

  // 각 이모지의 3초 타이머
  useEffect(() => {
    emojiReactions.forEach((reaction) => {
      const age = Date.now() - reaction.timestamp;
      const remaining = 3000 - age;

      if (remaining > 0) {
        const timer = setTimeout(() => {
          removeEmojiReaction(reaction.id);
        }, remaining);

        return () => clearTimeout(timer);
      }
    });
  }, [emojiReactions, removeEmojiReaction]);

  return (
    <div className="fixed bottom-20 right-4 pointer-events-none z-50 flex flex-col-reverse gap-2">
      {emojiReactions.map((reaction, index) => (
        <div
          key={reaction.id}
          className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-white/20 animate-slide-in-right"
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{reaction.emoji}</span>
            <div className="text-white">
              <p className="text-sm font-medium">{reaction.userName}</p>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-out {
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out, fade-out 0.3s ease-in 2.7s forwards;
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

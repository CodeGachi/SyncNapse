/**
 * 이모지 반응 오버레이 (토스트 스타일)
 *
 * Liveblocks Broadcast 이벤트를 통한 실시간 이모지 반응 표시
 * - 화면 우측 하단에 토스트처럼 나타남
 * - 3초 후 자동 제거 (부드러운 애니메이션)
 */

"use client";

import { useEffect } from "react";
import {
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { useCollaborationStore } from "@/stores/collaboration-store";
import type { AvailableEmoji } from "@/lib/types/collaboration";
import { motion, AnimatePresence } from "framer-motion";

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

  // 오래된 이모지 자동 제거 (주기적 체크)
  useEffect(() => {
    const interval = setInterval(() => {
      clearOldReactions();
    }, 200);

    return () => clearInterval(interval);
  }, [clearOldReactions]);

  // 각 이모지의 타이머 (Store의 REACTION_LIFETIME과 싱크)
  useEffect(() => {
    emojiReactions.forEach((reaction) => {
      const age = Date.now() - reaction.timestamp;
      const remaining = 4500 - age; // Store의 4.5초와 동일하게 설정

      if (remaining > 0) {
        const timer = setTimeout(() => {
          removeEmojiReaction(reaction.id);
        }, remaining);

        return () => clearTimeout(timer);
      }
    });
  }, [emojiReactions, removeEmojiReaction]);

  return (
    <div className="fixed bottom-24 right-6 pointer-events-none z-50 flex flex-col-reverse gap-3 items-end">
      <AnimatePresence mode="popLayout">
        {emojiReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            layout
            initial={{ opacity: 0, scale: 0.5, y: 20, x: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: 0,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.8
              }
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              y: -20,
              transition: { duration: 0.3, ease: "backIn" }
            }}
            className="bg-[#1a1a1a]/90 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl border border-[#AFC02B]/20 flex items-center gap-4 min-w-[180px]"
          >
            <span className="text-3xl filter drop-shadow-md animate-bounce-subtle">{reaction.emoji}</span>
            <div className="flex flex-col">
              <span className="text-white text-sm font-bold tracking-wide">{reaction.userName}</span>
            </div>

            {/* 장식용 글로우 효과 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#AFC02B]/10 to-transparent opacity-50" />
          </motion.div>
        ))}
      </AnimatePresence>
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

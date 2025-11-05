/**
 * 실시간 반응 이모지 패널 & 애니메이션
 * 학생들이 이모지로 반응하고 화면에 애니메이션으로 표시
 */

"use client";

import { useCollaborationStore } from "@/stores/collaboration-store";
import { useCallback, useEffect } from "react";
import { AVAILABLE_EMOJIS, type AvailableEmoji } from "@/lib/types/collaboration";

interface EmojiReactionsProps {
  userId: string;
  userName: string;
  noteId: string;
}

export function EmojiReactionsPanel({
  userId,
  userName,
  noteId,
}: EmojiReactionsProps) {
  const { addEmojiReaction } = useCollaborationStore();

  const handleAddReaction = useCallback(
    (emoji: AvailableEmoji) => {
      addEmojiReaction(userId, userName, emoji, noteId);
    },
    [userId, userName, noteId, addEmojiReaction]
  );

  return (
    <div className="flex flex-col gap-3 items-center justify-center h-full py-4">
      <div className="text-xs text-white/60 font-medium">반응 선택</div>
      <div className="grid grid-cols-3 gap-2">
        {AVAILABLE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleAddReaction(emoji)}
            className="text-3xl p-2 rounded hover:bg-white/10 transition-colors duration-200 active:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 이모지 애니메이션 오버레이
 * 노트 에디터 위에 떠다니는 이모지들을 표시
 */
export function EmojiAnimationOverlay() {
  const { emojiReactions, removeEmojiReaction, clearOldReactions } =
    useCollaborationStore();

  // 5초마다 오래된 반응 정리
  useEffect(() => {
    const interval = setInterval(clearOldReactions, 500);
    return () => clearInterval(interval);
  }, [clearOldReactions]);

  // 각 이모지가 3초 후 사라지도록
  useEffect(() => {
    if (emojiReactions.length === 0) return;

    const timers = emojiReactions.map((reaction) => {
      return setTimeout(() => {
        removeEmojiReaction(reaction.id);
      }, 3000);
    });

    return () => timers.forEach(clearTimeout);
  }, [emojiReactions, removeEmojiReaction]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {emojiReactions.map((reaction) => (
        <EmojiFloatingAnimation key={reaction.id} emoji={reaction.emoji} />
      ))}
    </div>
  );
}

/**
 * 개별 이모지 애니메이션
 */
function EmojiFloatingAnimation({ emoji }: { emoji: string }) {
  const randomX = Math.random() * 100; // 0-100%
  const randomY = Math.random() * 30 + 10; // 10-40%
  const randomRotate = Math.random() * 40 - 20; // -20 to 20 degrees
  const duration = 2.5; // 초

  return (
    <div
      className="absolute text-4xl font-bold animate-ping"
      style={{
        left: `${randomX}%`,
        top: `${randomY}%`,
        animation: `float ${duration}s ease-out forwards, fadeOut ${duration}s ease-out forwards`,
        transform: `rotate(${randomRotate}deg)`,
      }}
    >
      {emoji}

      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(${randomRotate}deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(${randomRotate}deg) scale(0.3);
            opacity: 0;
          }
        }

        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * 이모지 반응 통계 (선택사항)
 */
export function EmojiReactionStats() {
  const { emojiReactions } = useCollaborationStore();

  // 이모지별 개수 계산
  const stats = AVAILABLE_EMOJIS.map((emoji) => ({
    emoji,
    count: emojiReactions.filter((r) => r.emoji === emoji).length,
  })).filter((s) => s.count > 0);

  if (stats.length === 0) return null;

  return (
    <div className="flex gap-3 flex-wrap">
      {stats.map(({ emoji, count }) => (
        <div
          key={emoji}
          className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1"
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-xs text-white font-medium">{count}</span>
        </div>
      ))}
    </div>
  );
}
